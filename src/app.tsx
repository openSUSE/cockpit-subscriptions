import React, { createContext, useCallback, useEffect, useState } from 'react';
import { Card, CardBody, CardHeader, CardTitle } from "@patternfly/react-core/dist/esm/components/Card/index.js";

import cockpit from 'cockpit';
import { AlertGroup, AlertProps, Button, Page, PageSection, PageSectionVariants } from '@patternfly/react-core';
import { Backend, Extension, Subscription } from './backends/backend';
import { TransactionalUpdate } from './backends/transactional-update';
import { SuseConnect } from './backends/suseconnect';
import { RegisterCodeForm, RegisterFormData } from './components/register_code_form';
import { SubscriptionList } from './components/subscription_list';
import { useDialogs } from 'dialogs';
import { RebootDialog } from './components/reboot_dialog';
import { SettingsDialog } from './components/settings_dialog';
import { InlineNotification } from 'cockpit-components-inline-notification.jsx';

const _ = cockpit.gettext;

export type Notification = {
  type: AlertProps["variant"],
  text: string,
  detail: string,
};

const ErrorsContext = createContext<{errors: Notification[], setErrors: React.Dispatch<React.SetStateAction<Notification[]>>}>({
    errors: [],
    setErrors: () => {},
});

export const Application = () => {
    const [backend, setBackend] = useState<Backend | null>(null);
    const [loadingSubscriptions, setLoadingSubscriptions] = useState<boolean>(true);
    const [loadingExtensions, setLoadingExtensions] = useState<boolean>(true);
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [unregisteredSubscriptions, setUnregisteredSubscriptions] = useState<Extension[]>([]);
    const [formData, setFormData] = useState<RegisterFormData>({
        registrationCode: "",
        email: "",
    });
    const [errors, setErrors] = useState<Notification[]>([]);
    const [loadedSubscriptions, setLoadedSubscriptions] = useState<boolean>(false);

    const Dialogs = useDialogs();

    useEffect(() => {
        cockpit.spawn(["test", "-e", "/sbin/transactional-update"], { err: "ignore" })
                .then(() => setBackend(new TransactionalUpdate()))
                .catch(() => {
                    cockpit.spawn(["test", "-e", "/usr/bin/suseconnect"], { err: "ignore" })
                            .then(() => setBackend(new SuseConnect()));
                });
    }, [setBackend]);

    const updateSubscriptions = useCallback(() => {
        if (backend === null) {
            return;
        }
        setLoadingSubscriptions(true);

        // handle get subscriptions
        backend.getSubscriptions()
                .then((subscriptions) => {
                    setSubscriptions(subscriptions);
                    setLoadingSubscriptions(false);
                })
                .catch((output: Error) => {
                    setErrors([...errors, {
                        type: "danger",
                        text: _("Failed to retrieve subscriptions"),
                        detail: output.toString(),
                    }]);
                    setLoadingExtensions(false);
                })
                .finally(() => {
                    backend.getExtensions()
                            .then((subscriptions) => {
                                setUnregisteredSubscriptions(subscriptions);
                                setLoadingExtensions(false);
                            })
                            .catch((output: Error) => {
                                console.log("failed to retreive extensions", output);
                                setUnregisteredSubscriptions([]);
                                setLoadingExtensions(false);
                                setErrors([...errors, {
                                    type: "danger",
                                    text: _("Failed to retrieve extensions"),
                                    detail: output.toString(),
                                }]);
                            });
                });
    }, [backend, setLoadingSubscriptions, setSubscriptions, setUnregisteredSubscriptions, setLoadingExtensions, errors]);

    useEffect(() => {
        if (!loadedSubscriptions && backend !== null) {
            setLoadedSubscriptions(true);
            updateSubscriptions();
        }
    }, [updateSubscriptions, loadedSubscriptions, setLoadingExtensions, backend]);

    const registerProduct = useCallback(async (): Promise<[boolean, string]> => {
        console.debug("registering", formData);
        const result = await backend?.register(formData.registrationCode, formData.email, "").then((result) => {
            if (result[0]) {
                if (result[1].includes("Please reboot your machine")) {
                    // Show reboot modal
                    Dialogs.show(<RebootDialog />);
                    return result;
                }

                updateSubscriptions();
                return result;
            }
        })
                .catch((output) => {
                    setErrors([...errors, {
                        type: "danger",
                        text: _("Failed to register system"),
                        detail: output.toString(),
                    }]);
                });

        return result || [false, ""];
    }, [backend, Dialogs, formData, updateSubscriptions, errors]);

    const deactivateProduct = useCallback((subscription: Subscription | Extension): void => {
        console.log("deregistering", subscription.identifier);
        setLoadingSubscriptions(true);
        backend?.deregister([subscription.identifier, subscription.version, subscription.arch].join("/"))
                .then(async (output) => {
                    if (output.includes("Please reboot your machine")) {
                        Dialogs.show(<RebootDialog />);
                    }
                    setLoadingSubscriptions(false);
                    updateSubscriptions();
                })
                .catch(async (output) => {
                    // Can't deregister base product
                    if (output.exit_status === 70) {
                        output = backend.deregister().then(() => {
                            setLoadingSubscriptions(false);
                            updateSubscriptions();
                        })
                                .catch((output) => {
                                    setErrors([...errors, {
                                        type: "danger",
                                        text: _("Failed to deactivate product"),
                                        detail: output.toString(),
                                    }]);
                                });
                    } else {
                        setErrors([...errors, {
                            type: "danger",
                            text: _("Failed to deactivate product"),
                            detail: output.toString(),
                        }]);
                    }
                });
    }, [backend, Dialogs, updateSubscriptions, errors]);

    const activateProduct = useCallback((subscription: Subscription | Extension): void => {
        console.log("activating", subscription.identifier);
        setLoadingExtensions(true);
        backend?.register("", "", [subscription.identifier, subscription.version, subscription.arch].join("/"))
                .then(async (result) => {
                    if (result[0]) {
                        if (result[1].includes("Please reboot your machine")) {
                        // Show reboot modal
                            Dialogs.show(<RebootDialog />);
                        }
                    }
                    console.log("activated");
                    setLoadingExtensions(false);
                    updateSubscriptions();
                })
                .catch((output) => {
                    setErrors([...errors, {
                        type: "danger",
                        text: _("Failed to deactivate product"),
                        detail: output.toString(),
                    }]);
                });
    }, [backend, Dialogs, updateSubscriptions, errors]);

    const dismissErrorNotification = (index: number) => {
        const errorNotifications = [...errors];
        errorNotifications.splice(index, 1);
        setErrors(errorNotifications);
    };

    const registrationErrors = errors
        ? (
            <AlertGroup isToast>
                {errors.map((error, index) => {
                    return (
                        <InlineNotification
type={error.type || 'danger'} key={index}
                            isLiveRegion
                            isInline={false}
                            onDismiss={() => dismissErrorNotification(index)}
                            text={error.text}
                            detail={error.detail} />
                    );
                })}
            </AlertGroup>
        )
        : undefined;

    return (
        <ErrorsContext.Provider value={{ errors, setErrors }}>
            <Page>
                {registrationErrors}
                <PageSection variant={PageSectionVariants.light}>
                    <Card>
                        <CardHeader actions={{
                            actions: <Button
    variant="secondary" id="settings-button"
                                        component="a"
                                        onClick={() => Dialogs.show(<SettingsDialog />)}
                            >{_("Edit Settings")}</Button>,
                        }}
                        >
                            <CardTitle>{_("Register a new subscription")}</CardTitle>
                        </CardHeader>
                        <CardBody>
                            <RegisterCodeForm submitCallback={registerProduct} formData={formData} setFormData={setFormData} />
                        </CardBody>
                    </Card>
                    <Card>
                        <CardTitle>{_("Registered Subscriptions")}</CardTitle>
                        <CardBody>
                            <SubscriptionList subscriptions={subscriptions} loading={loadingSubscriptions} deactivate={deactivateProduct} />
                        </CardBody>
                    </Card>
                    {unregisteredSubscriptions.length
                        ? <Card>
                            <CardTitle>{_("Available Extensions")}</CardTitle>
                            <CardBody>
                                <SubscriptionList subscriptions={unregisteredSubscriptions} loading={loadingExtensions} activate={activateProduct} />
                            </CardBody>
                        </Card>
                        : ""}
                </PageSection>
            </Page>
        </ErrorsContext.Provider>
    );
};

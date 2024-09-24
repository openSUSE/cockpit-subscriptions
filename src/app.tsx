import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardBody, CardTitle } from "@patternfly/react-core/dist/esm/components/Card/index.js";

import cockpit from 'cockpit';
import { Page, PageSection, PageSectionVariants } from '@patternfly/react-core';
import { Backend, Extension, Subscription } from './backends/backend';
import { TransactionalUpdate } from './backends/transactional-update';
import { SuseConnect } from './backends/suseconnect';
import { RegisterCodeForm, RegisterFormData } from './components/register_code_form';
import { SubscriptionList } from './components/subscription_list';
import { useDialogs } from 'dialogs';
import { RebootDialog } from './components/reboot_dialog';

export const Application = () => {
    const [backend, setBackend] = useState<Backend | null>(null);
    const [loadingSubscriptions, setLoadingSubscriptions] = useState<boolean>(true);
    const [loadingExtensions, setLoadingExtensions] = useState<boolean>(true);
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [unregisteredSubscriptions, setUnregisteredSubscriptions] = useState<Extension[]>([]);
    const [formData, setFormData] = useState<RegisterFormData>({
        registrationCode: "",
        email: "",
        product: "",
    });

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
                .finally(() => {
                    backend.getExtensions()
                            .then((subscriptions) => {
                                setUnregisteredSubscriptions(subscriptions);
                                setLoadingExtensions(false);
                            })
                            .catch(() => {
                                setUnregisteredSubscriptions([]);
                                setLoadingExtensions(false);
                            });
                });
    }, [backend, setLoadingSubscriptions, setSubscriptions, setUnregisteredSubscriptions, setLoadingExtensions]);

    useEffect(() => {
        updateSubscriptions();
    }, [updateSubscriptions, backend]);

    const registerProduct = useCallback(async (): Promise<[boolean, string]> => {
        console.debug("registering", formData);
        const result = await backend?.register(formData.registrationCode, formData.email, formData.product).then((result) => {
            if (result[0]) {
                if (result[1].includes("Please reboot your machine")) {
                    // Show reboot modal
                    Dialogs.show(<RebootDialog />);
                    return result;
                }

                updateSubscriptions();
                return result;
            }

            return result;
        });

        return result || [false, ""];
    }, [backend, Dialogs, formData, updateSubscriptions]);

    const deactivateProduct = useCallback((subscription: Subscription | Extension): void => {
        console.log("deregistering", subscription.identifier);
        setLoadingSubscriptions(true);
        backend?.deregister([subscription.identifier, subscription.version, subscription.arch].join("/"))
                .then(async (output) => {
                    console.log(output);
                    if (output.includes("Can not deregister base product")) {
                        console.log("deregistering base");
                        output = await backend.deregister();
                        setLoadingSubscriptions(false);
                        updateSubscriptions();
                        console.log("base deregistered");
                    } else {
                        if (output.includes("Please reboot your machine")) {
                            Dialogs.show(<RebootDialog />);
                        }
                        setLoadingSubscriptions(false);
                        updateSubscriptions();
                    }
                });
    }, [backend, Dialogs, updateSubscriptions]);

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
                });
    }, [backend, Dialogs, updateSubscriptions]);

    return (
        <Page>
            <PageSection variant={PageSectionVariants.light}>
                <Card>
                    <CardTitle>Register a new subscription</CardTitle>
                    <CardBody>
                        <RegisterCodeForm submitCallback={registerProduct} formData={formData} setFormData={setFormData} />
                    </CardBody>
                </Card>
                <Card>
                    <CardTitle>Registered Subscriptions</CardTitle>
                    <CardBody>
                        <SubscriptionList subscriptions={subscriptions} loading={loadingSubscriptions} deactivate={deactivateProduct} />
                    </CardBody>
                </Card>
                {unregisteredSubscriptions.length
                    ? <Card>
                        <CardTitle>Available Extensions</CardTitle>
                        <CardBody>
                            <SubscriptionList subscriptions={unregisteredSubscriptions} loading={loadingExtensions} activate={activateProduct} />
                        </CardBody>
                    </Card>
                    : ""}
            </PageSection>
        </Page>
    );
};

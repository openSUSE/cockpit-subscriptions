import cockpit from 'cockpit';
import { Form, Grid, FormGroup, TextInput, GridItem, ActionGroup, Button, Stack, StackItem, Flex, FlexItem } from "@patternfly/react-core";
import React, { Dispatch, SetStateAction, useState } from "react";
import { EmptyStatePanel } from 'cockpit-components-empty-state';
import { SimpleSelect } from "cockpit-components-simple-select";

const _ = cockpit.gettext;

type RegisterFormData = {
    registrationCode: string,
    email: string,
    registrationServerUrl: string,
    registrationServer: "scc" | "custom",
};

type Props = {
    submitCallback: () => Promise<[boolean, string]>,
    formData: RegisterFormData,
    setFormData: Dispatch<SetStateAction<RegisterFormData>>,
};

const RegisterCodeForm = ({ submitCallback, formData, setFormData }: Props) => {
    const [submitting, setSubmitting] = useState<boolean>(false);

    const onValueChange = (fieldName: string, value: string | number) => {
        setFormData({ ...formData, [fieldName]: value });
    };

    const submit = () => {
        setSubmitting(true);
        submitCallback().then((result: [boolean, string]) => {
            if (result[0]) {
                setFormData({
                    registrationCode: "",
                    email: "",
                    registrationServer: "scc",
                    registrationServerUrl: "",
                });
            }

            setSubmitting(false);
        });
    };

    if (submitting)
        return <EmptyStatePanel loading />;

    return (
        <Form>
            <Stack>
                <StackItem>
                    <Flex>
                        <FlexItem>
                            <FormGroup label={_("Registration Server")} fieldId="registration-server">
                                <SimpleSelect
                                    options={[
                                        { value: "scc", content: _("SUSE Customer Center (SCC)") },
                                        { value: "custom", content: _("Custom") }
                                    ]}
                                    selected={formData.registrationServer}
                                    onSelect={(value) => onValueChange("registrationServer", value)}
                                />
                            </FormGroup>
                        </FlexItem>
                        {formData.registrationServer === "custom" &&
                            <FlexItem>
                                <FormGroup label={_("Server URL")} fieldId="server-url">
                                    <TextInput
                                        onChange={(_, value) => onValueChange("registrationServerUrl", value)} value={formData.registrationServerUrl}
                                    />
                                </FormGroup>
                            </FlexItem>}
                    </Flex>
                </StackItem>
            </Stack>
            <Grid hasGutter md={4}>
                <FormGroup label={_("Registration Code")} fieldId="registration-code">
                    <TextInput
                        onChange={(_, value) => onValueChange("registrationCode", value)} value={formData.registrationCode}
                    />
                </FormGroup>
                <FormGroup label={_("Email")} fieldId="email">
                    <TextInput
                        onChange={(_, value) => onValueChange("email", value)} value={formData.email}
                    />
                </FormGroup>
                <GridItem span={12}>
                    <ActionGroup>
                        <Button onClick={submit} variant="primary">{_("Register")}</Button>
                    </ActionGroup>
                </GridItem>
            </Grid>
        </Form>
    );
};

export { RegisterCodeForm, RegisterFormData };

import cockpit from 'cockpit';
import { Form, Grid, FormGroup, TextInput, GridItem, ActionGroup, Button } from "@patternfly/react-core";
import React, { Dispatch, SetStateAction, useState } from "react";
import { EmptyStatePanel } from 'cockpit-components-empty-state';

const _ = cockpit.gettext;

type RegisterFormData = {
    registrationCode: string,
    email: string,
    proxy: string,
};

type Props = {
    submitCallback: () => Promise<[boolean, string]>,
    formData: RegisterFormData,
    setFormData: Dispatch<SetStateAction<RegisterFormData>>,
};

const RegisterCodeForm = ({ submitCallback, formData, setFormData }: Props) => {
    const [submitting, setSubmitting] = useState<boolean>(false);

    const onValueChange = (fieldName: string, value: string|number) => {
        setFormData({ ...formData, [fieldName]: value });
    };

    const submit = () => {
        setSubmitting(true);
        submitCallback().then((result: [boolean, string]) => {
            if (result[0]) {
                setFormData({
                    registrationCode: "",
                    email: "",
                    proxy: "",
                });
            }

            setSubmitting(false);
        });
    };

    if (submitting)
        return <EmptyStatePanel loading />;

    return (
        <Form>
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
                <FormGroup label={_("Proxy")} fieldId="proxy">
                    <TextInput
                        onChange={(_, value) => onValueChange("proxy", value)} value={formData.proxy}
                    />
                </FormGroup>
                <GridItem span={12}>
                    <ActionGroup>
                        <Button onClick={submit} variant="primary">{_("Activate")}</Button>
                    </ActionGroup>
                </GridItem>
            </Grid>
        </Form>
    );
};

export { RegisterCodeForm, RegisterFormData };

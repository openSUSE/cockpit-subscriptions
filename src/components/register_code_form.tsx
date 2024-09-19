import cockpit from 'cockpit';
import { Form, Grid, FormGroup, TextInput, GridItem, ActionGroup, Button } from "@patternfly/react-core";
import React, { useState } from "react";
import { EmptyStatePanel } from 'cockpit-components-empty-state';

const _ = cockpit.gettext;

type RegisterFormData = {
    registrationCode: string,
    email: string,
    product: string,
};

type Props = {
    submitCallback: any,
    formData: RegisterFormData,
    setFormData: any,
};

const RegisterCodeForm = ({ submitCallback, formData, setFormData }: Props) => {
    const [submitting, setSubmitting] = useState<boolean>(false);

    const onValueChange = (fieldName: string, value: any) => {
        setFormData({ ...formData, [fieldName]: value });
    };

    const submit = () => {
        setSubmitting(true);
        submitCallback().then((success: boolean) => {
            if (success) {
                setFormData({
                    registrationCode: "",
                    email: "",
                    product: "",
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
                <FormGroup label={_("Email")} fieldId="registration-code">
                    <TextInput
                        onChange={(_, value) => onValueChange("email", value)} value={formData.email}
                    />
                </FormGroup>
                <FormGroup label={_("Product")} fieldId="product">
                    <TextInput
                        onChange={(_, value) => onValueChange("product", value)} value={formData.product}
                    />
                </FormGroup>
                <GridItem span={12}>
                    <ActionGroup>
                        <Button onClick={submit} variant="primary">Submit</Button>
                    </ActionGroup>
                </GridItem>
            </Grid>
        </Form>
    );
};

export { RegisterCodeForm, RegisterFormData };

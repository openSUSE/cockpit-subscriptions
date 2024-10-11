import cockpit from 'cockpit';
import { Form, FormGroup, TextInput, ActionGroup, Button, Checkbox } from "@patternfly/react-core";
import React, { Dispatch, SetStateAction, useCallback, useEffect, useState } from "react";
import { EmptyStatePanel } from 'cockpit-components-empty-state';

const _ = cockpit.gettext;

type SettingsFormData = {
    url: string,
    language: string,
    insecure: boolean,
};

type Props = {
    formData: SettingsFormData,
    setFormData: Dispatch<SetStateAction<SettingsFormData>>,
};

const SettingsForm = ({ formData, setFormData }: Props) => {
    const suseconnect_path = "/etc/SUSEConnect";
    const [submitting, setSubmitting] = useState<boolean>(false);

    const onValueChange = (fieldName: string, value: string | number | boolean) => {
        setFormData({ ...formData, [fieldName]: value });
    };

    const setFormFields = useCallback(() => {
        cockpit.file(suseconnect_path, { superuser: "required" }).read()
                .then(content => {
                    console.log(content);
                    const newFormData = { ...formData };
                    const url = content.match(/^url: ?(.*?)$/m) || [];
                    if (url.length === 2) {
                        newFormData.url = url[1];
                    }
                    const language = content.match(/^language: ?(.*?)$/m) || [];
                    if (language.length === 2) {
                        newFormData.language = language[1];
                    }
                    const insecure = content.match(/^insecure: ?(.*?)$/m) || [];
                    if (insecure.length === 2) {
                        newFormData.insecure = insecure[1] === 'true';
                    }

                    setFormData(newFormData);
                });
    }, [formData, setFormData]);

    useEffect(() => {
        setFormFields();
    }, [setFormData, setFormFields]);

    const submit = useCallback(() => {
        setSubmitting(true);
        // https://manpages.opensuse.org/Tumbleweed/suseconnect-ng/SUSEConnect.5.en.html
        const contentLines = ["---"];

        if (formData.url)
            contentLines.push("url: " + formData.url);

        if (formData.language)
            contentLines.push("language: " + formData.language);

        if (formData.insecure)
            contentLines.push("insecure: " + formData.insecure);

        cockpit.file(suseconnect_path, { superuser: "required" }).replace(contentLines.join("\n") + "\n")
                .then((result: string) => {
                    if (result[0]) {
                        setFormFields();
                    }

                    setSubmitting(false);
                })
                .catch((e) => console.log(e));
    }, [setSubmitting, setFormFields, formData]);

    if (submitting)
        return <EmptyStatePanel loading />;

    return (
        <Form>
            <FormGroup label={_("Proxy Url")} fieldId="url">
                <TextInput
                    aria-label="Proxy url"
                    onChange={(_, value) => onValueChange("url", value)} value={formData.url}
                    placeholder="https://localhost:8080/"
                />
            </FormGroup>
            <FormGroup fieldId="insecure">
                <Checkbox
                    aria-label="Allow Insecure Proxy"
                    id="insecure-field"
                    onChange={(_, value) => onValueChange("insecure", value)} isChecked={formData.insecure}
                    label="Allow Insecure Proxies"
                />
            </FormGroup>
            <FormGroup label={_("Language (Country Code)")} fieldId="language">
                <TextInput
                    aria-label="Language (Country Code)"
                    onChange={(_, value) => onValueChange("language", value)} value={formData.language}
                    placeholder="en"
                />
            </FormGroup>
            <ActionGroup>
                <Button onClick={submit} variant="primary">{_("save")}</Button>
            </ActionGroup>
        </Form>
    );
};

export { SettingsForm, SettingsFormData };

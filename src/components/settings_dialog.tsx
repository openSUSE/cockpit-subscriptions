import React, { useState } from 'react';
import { Modal } from '@patternfly/react-core';
import cockpit from 'cockpit';

import { useDialogs } from 'dialogs.jsx';
import { SettingsForm, SettingsFormData } from './settings_form';

const _ = cockpit.gettext;

export const SettingsDialog = () => {
    const Dialogs = useDialogs();
    const [formData, setFormData] = useState<SettingsFormData>({
        url: "",
        language: "",
        insecure: false,
    });

    return (
        <Modal
            title={_("Settings")} variant="small" onClose={() => Dialogs.close()} isOpen
        >
            <SettingsForm formData={formData} setFormData={setFormData} />
        </Modal>
    );
};

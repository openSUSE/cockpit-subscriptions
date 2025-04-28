import React from 'react';
import { Button, Modal } from '@patternfly/react-core';
import cockpit from 'cockpit';

import { useDialogs } from 'dialogs.jsx';

const _ = cockpit.gettext;

export const RebootDialog = () => {
    const Dialogs = useDialogs();

    const reboot = () => {
        cockpit.spawn(["reboot"], { superuser: "require" });
    };

    return (
        <Modal
            title={_("This requires a reboot")} variant="small" onClose={() => Dialogs.close()} isOpen
            footer={
                <Button className="pf-v5-u-m-0" onClick={reboot} variant="primary">{_("Reboot")}</Button>
            }
        >
            <p>{_("This requires a reboot to take effect. If you don't reboot now, this change might not be included")}</p>
        </Modal>
    );
};

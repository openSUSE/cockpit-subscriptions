import React from 'react';
import { Button, Modal, ModalFooter, ModalHeader } from '@patternfly/react-core';
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
        >
            <ModalHeader>
                <p>{_("This requires a reboot to take effect. If you don't reboot now, this change might not be included")}</p>
            </ModalHeader>
            <ModalFooter>
                <Button className="pf-v6-u-m-0" onClick={reboot} variant="primary">{_("Reboot")}</Button>
            </ModalFooter>
        </Modal>
    );
};

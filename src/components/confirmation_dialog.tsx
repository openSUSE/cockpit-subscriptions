import React from "react";
import { Button, Modal, ModalFooter, ModalHeader } from "@patternfly/react-core";
import { useDialogs } from "dialogs";

import cockpit from "cockpit";

const _ = cockpit.gettext;

export const ConfirmationDialog = ({
    title,
    callback,
    children,
}: {
  title: string;
  callback: () => void;
  children?: React.ReactNode;
}) => {
    const Dialogs = useDialogs();

    return (
        <Modal
            title={title}
            variant="small"
            onClose={() => Dialogs.close()}
            isOpen
        >
            <ModalHeader>
                {children}
            </ModalHeader>
            <ModalFooter>
                <Button
                    variant="danger"
                    onClick={() => { callback(); Dialogs.close() }}
                    aria-label={title}
                >
                    {_("Delete")}
                </Button>
                <Button
                    variant="link"
                    className="btn-cancel"
                    onClick={() => Dialogs.close()}
                >
                    {_("Cancel")}
                </Button>
            </ModalFooter>
        </Modal>
    );
};

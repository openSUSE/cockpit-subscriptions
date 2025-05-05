import cockpit from 'cockpit';
import React from "react";
import { Badge, Button, Flex, FlexItem, List, ListItem } from "@patternfly/react-core";
import { Extension, Subscription } from "../backends/backend";
import { EmptyStatePanel } from "cockpit-components-empty-state";
import { useDialogs } from 'dialogs';
import { ConfirmationDialog } from './confirmation_dialog';

const _ = cockpit.gettext;

type Props = {
    subscriptions: Subscription[] | Extension[],
    loading: boolean,
    deactivate?: (subscription: Subscription | Extension) => void,
    activate?: (subscription: Subscription | Extension) => void,
};

export const SubscriptionList = ({ subscriptions, loading, deactivate, activate }: Props) => {
    const Dialogs = useDialogs();

    const format_date = (date: string): string => {
        const dateObj = new Date(Date.parse(date));

        return dateObj.toISOString().split("T")[0].split("-").reverse().join('-');
    };

    if (loading)
        return <EmptyStatePanel title={_("Loading Subscriptions")} loading />;

    return (
        <List isPlain>
            {subscriptions.map((item: Subscription | Extension) => {
                return (
                    <ListItem key={item.identifier}>
                        <Flex>
                            <FlexItem>
                                {item.identifier}
                                <Badge key="version" className="pf-v6-u-mx-xs">
                                    {item.version}
                                </Badge>
                                <Badge key="arch" className="pf-v6-u-mx-xs">
                                    {item.arch}
                                </Badge>
                                {item.expires_at
                                    ? (
                                        <Badge key="expires" className="pf-v6-u-mx-xs">
                                            {_("Expires:")} {format_date(item.expires_at)}
                                        </Badge>
                                    )
                                    : ""}
                            </FlexItem>
                            <FlexItem align={{ default: "alignRight" }}>
                                {deactivate
                                    ? (
                                        <Button onClick={() => Dialogs.show(<ConfirmationDialog title={_("Are you sure you want to de-register this system?")} callback={() => deactivate(item)}><p>{_("This action cannot be undone")}</p></ConfirmationDialog>)}>
                                            {_("De-register")}
                                        </Button>
                                    )
                                    : ""}
                                {activate
                                    ? (
                                        <Button onClick={() => activate(item)}>
                                            {_("Register")}
                                        </Button>
                                    )
                                    : ""}
                            </FlexItem>
                        </Flex>
                    </ListItem>
                );
            })}
        </List>
    );
};

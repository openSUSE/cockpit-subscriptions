import cockpit from 'cockpit';
import React from "react";
import { Badge, Button, Flex, FlexItem, List, ListItem } from "@patternfly/react-core";
import { Extension, Subscription } from "../backends/backend";
import { EmptyStatePanel } from "cockpit-components-empty-state";

const _ = cockpit.gettext;

type Props = {
    subscriptions: Subscription[] | Extension[],
    loading: boolean,
    deactivate?: (subscription: Subscription | Extension) => void,
    activate?: (subscription: Subscription | Extension) => void,
};

export const SubscriptionList = ({ subscriptions, loading, deactivate, activate }: Props) => {
    const format_date = (date: string): string => {
        const dateObj = new Date(Date.parse(date));

        return dateObj.toISOString().split("T")[0].split("-").reverse()
                .join('-');
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
                                <Badge key="version" className="pf-v5-u-mx-xs">
                                    {item.version}
                                </Badge>
                                <Badge key="arch" className="pf-v5-u-mx-xs">
                                    {item.arch}
                                </Badge>
                                {item.expires_at
                                    ? <Badge key="expires" className="pf-v5-u-mx-xs">
                                      Expires: {format_date(item.expires_at)}
                                    </Badge>
                                    : ""}
                            </FlexItem>
                            <FlexItem align={{ default: "alignRight" }}>
                                {deactivate
                                    ? <Button onClick={() => deactivate(item)}>
                                      Deactivate
                                    </Button>
                                    : ""}
                                {activate
                                    ? <Button onClick={() => activate(item)}>
                                      Activate
                                    </Button>
                                    : ""}
                            </FlexItem>
                        </Flex>
                    </ListItem>
                );
            })}
        </List>
    );
};

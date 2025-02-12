import cockpit from 'cockpit';
import { Backend, CockpitSpawnError, Extension, Subscription, SUSEConnectExitCodes } from './backend';

export class SuseConnect implements Backend {
    async getSubscriptions(): Promise<Subscription[]> {
        let result = null;
        let retry = true;
        let tries = 0;

        // Zypper is busy on pageload due to other cockpit actions
        // so we need to implement some basic retrying
        while (retry && tries <= 20) {
            await this.getSubscriptionsStatus()
                    .then((response) => {
                        retry = false;
                        result = JSON.parse(response).filter((product: Subscription) => product.status !== "Not Registered");
                    })
                    .catch((error: CockpitSpawnError) => {
                        tries++;
                        if (error.exit_status !== SUSEConnectExitCodes.ZyppBusy) {
                            retry = false;
                        }
                    });
        }

        if (result)
            return result;

        throw new Error("Unable to get subscriptions");
    }

    async getSubscriptionsStatus(): Promise<string> {
        // Since suseconnect is just used inside transactional-update we can
        // skip the subvolume setup and save alot of loadtime
        return cockpit.spawn(["suseconnect", "-s"], { superuser: "require" });
    }

    async getExtensions(): Promise<Extension[]> {
        let result;
        let retry = true;
        let tries = 0;

        // Zypper is busy on pageload due to other cockpit actions
        // so we need to implement some basic retrying
        while (retry && tries <= 20) {
            await this.getAvailableExtensions()
                    .then((response) => {
                        retry = false;
                        result = (JSON.parse(response).extensions || []).filter((product: Extension) => product.free === true && product.available === true && product.activated === false);
                    })
                    .catch((error: CockpitSpawnError) => {
                        tries++;
                        if (error.exit_status === SUSEConnectExitCodes.NotRegistered) {
                            retry = false;
                            result = [];
                        } if (error.exit_status !== SUSEConnectExitCodes.ZyppBusy) {
                            retry = false;
                        }
                    });
        }

        if (result !== undefined)
            return result;

        throw new Error("Unable to get extensions");
    }

    async getAvailableExtensions(): Promise<string> {
        // Since suseconnect is just used inside transactional-update we can
        // skip the subvolume setup and save alot of loadtime
        return cockpit.spawn(["suseconnect", "--json", "-l"], { superuser: "require" });
    }

    async register(reg_code: string, email: string, product: string): Promise<[boolean, string]> {
        console.debug("attempting to register system");
        const options = [];
        if (email !== "") {
            options.push("-e", email);
        }
        if (product !== "") {
            options.push("-p", product);
        }
        console.log(["suseconnect", "-r", reg_code, ...options].join(" "));
        return cockpit.spawn(["suseconnect", "-r", reg_code, ...options], { superuser: "require" })
                .then((result): [boolean, string] => {
                    console.debug("registration result", result);
                    return [result.includes("Successfully registered system"), ""];
                });
    }

    async deregister(product?: string): Promise<string> {
        const productOption = [];
        if (product) {
            productOption.push('-p', product);
        }

        console.log(["suseconnect", "-d", ...productOption].join(" "));
        return cockpit.spawn(["suseconnect", "-d", ...productOption], { superuser: "require" });
    }
}

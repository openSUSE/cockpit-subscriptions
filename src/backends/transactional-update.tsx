import cockpit from 'cockpit';
import { Backend, Subscription, CockpitSpawnError, SUSEConnectExitCodes, Extension } from './backend';

export class TransactionalUpdate implements Backend {
    async getSubscriptions(): Promise<Subscription[]> {
        let result;
        let retry = true;
        let tries = 0;

        // Zypper is busy on pageload due to other cockpit actions
        // so we need to implement some basic retrying
        while (retry && tries <= 20) {
            console.log("attempting");
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
        console.log("getting extensions");

        // Zypper is busy on pageload due to other cockpit actions
        // so we need to implement some basic retrying
        while (retry && tries <= 20) {
            await this.getAvailableExtensions()
                    .then((response) => {
                        retry = false;
                        result = (JSON.parse(response).extensions || []).filter((product: Extension) => product.free === true && product.available === true && product.activated === false);
                        console.log("got extensions", result);
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

        throw new Error("Unable to get extensions");
    }

    async getAvailableExtensions(): Promise<string> {
        // Since suseconnect is just used inside transactional-update we can
        // skip the subvolume setup and save alot of loadtime
        return cockpit.spawn(["suseconnect", "--json", "-l"], { superuser: "require" });
    }

    async register(reg_code: string, email: string, product: string): Promise<[boolean, string]> {
        console.debug("attempting to register system");
        let regOption = "";
        if (reg_code !== "") {
            regOption = "-r " + reg_code;
        }
        let emailOption = "";
        if (email !== "") {
            emailOption = "-e " + email;
        }
        let productOption = "";
        if (product !== "") {
            productOption = "-p " + product;
        }
        return cockpit.spawn(["transactional-update", "--no-selfupdate", "-n", "-d", "register", regOption, emailOption, productOption], { superuser: "require" })
                .then((result): [boolean, string] => {
                    console.debug("registration result", result);
                    return [result.includes("Successfully registered system"), result];
                })
                .catch((error: CockpitSpawnError, data?: string): [boolean, string] => {
                    console.error("Failed to register system with", error);
                    return [false, data || error.toString()];
                });
    }

    async deregister(product?: string): Promise<string> {
        let productOption = "";
        if (product) {
            productOption = "-p " + product;
        }

        return cockpit.spawn(["transactional-update", "--no-selfupdate", "-d", "register", "-d", productOption], { superuser: "require" });
    }
}

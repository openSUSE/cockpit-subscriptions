import cockpit from 'cockpit';
import { Backend, Subscription, CockpitSpawnError, SUSEConnectExitCodes, Extension } from './backend';

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
        let result = null;
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
        let emailOption = "";
        if (email !== "") {
            emailOption = "-e " + email;
        }
        let productOption = "";
        if (product !== "") {
            productOption = "-p " + product;
        }
        console.log(["suseconnect", "-r", reg_code, emailOption, productOption].join(" "));
        return cockpit.spawn(["suseconnect", "-r", reg_code, emailOption, productOption], { superuser: "require" })
                .then((result): [boolean, string] => {
                    console.debug("registration result", result);
                    return [result.includes("Successfully registered system"), ""];
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

        console.log(["suseconnect", "-d", productOption].join(" "));
        return cockpit.spawn(["suseconnect", "-d", productOption], { superuser: "require" });
    }
}

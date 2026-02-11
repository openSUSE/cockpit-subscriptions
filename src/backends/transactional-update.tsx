import cockpit from 'cockpit';
import { Backend, CockpitSpawnError, Extension, Subscription, SUSEConnectExitCodes } from './backend';

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

    async register(reg_code: string, email: string, product: string, url: string = ""): Promise<[boolean, string]> {
        console.debug("attempting to register system");
        const options = [];
        if (reg_code !== "") {
            options.push("-r", reg_code);
        }
        if (email !== "") {
            options.push("-e", email);
        }
        if (product !== "") {
            options.push("-p", product);
        }
        if (url !== "") {
            options.push("--url", url, "--write-config");
        }
        return cockpit.spawn(["transactional-update", "--no-selfupdate", "-n", "-d", "register", ...options], { superuser: "require" })
                        .then((result): [boolean, string] => {
                            console.debug("registration result", result);
                            return [result.includes("Successfully registered system"), result];
                        })
                        .catch((error: CockpitSpawnError, data?: string): [boolean, string] | Promise<[boolean, string]> => {
                            if (data) {
                                console.log(data);
                                const matched = [...data.matchAll(/Error: (.*?)$/gm)];
                                if (matched && matched[0]) {
                                    error.message = matched[0][1];
                                }
                            }

                            return new Promise<[boolean, string]>(() => { throw new Error(error.message) });
                        });
    }

    async deregister(product?: string): Promise<string> {
        const options = [];
        if (product) {
            options.push("-p", product);
        }

        return cockpit.spawn(["transactional-update", "--no-selfupdate", "-d", "register", "-d", ...options], { superuser: "require", err: "out" })
                        .catch(async (output: CockpitSpawnError, data?: string) => {
                            if (data && data.includes("exit status 70")) {
                                return cockpit.spawn(["transactional-update", "--no-selfupdate", "-d", "register", "-d"], { superuser: "require" });
                            }

                            // @ts-expect-error cockpit gives bad typing for this function call
                            throw new cockpit.ProcessError(output);
                        });
    }
}

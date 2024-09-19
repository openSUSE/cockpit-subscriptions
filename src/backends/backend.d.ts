type Extension = {
    name: string,
    identifier: string,
    version: string,
    arch: string,
    activated: boolean,
    available: boolean,
    free: boolean
    extensions: Extension[],
    expires_at?: string,
}

declare enum SubscriptionStatus {
    Active = "Active",
    Expired = "Expired",
    Unregistered = "Unregistered",
}

type Subscription = {
    name?: string,
    identifier: string,
    version: string,
    arch: string,
    status: string,
    regcode?: string,
    starts_at?: string,
    expires_at?: string,
    subscription_status?: SubscriptionStatus,
    type?: string,
    extensions?: Extension[],
}

// Cockpits typescript types don't contain this
// Just a more slimmed down BasicError, might be worth upstreaming
type CockpitSpawnError = {
    message: string,
    problem: string | null,
    exit_status: number | null,
    exit_signal: string | null,
}

declare enum SUSEConnectExitCodes {
    ZyppBusy = 7,
}

interface Backend {
    getSubscriptions(): Promise<Subscription[]>;

    getExtensions(): Promise<Extension[]>;

    register(reg_code?: string, email?: string, product?: string): Promise<[boolean, string]>;

    deregister(product?: string): Promise<string>;
}

export { Backend, Subscription, SubscriptionStatus, Extension, CockpitSpawnError, SUSEConnectExitCodes };

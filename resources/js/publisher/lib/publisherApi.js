import { prepareSanctum } from '../../lib/auth';

/** @param {string} path e.g. 'publisher/dashboard' (no api/ prefix) */
export async function publisherGet(path) {
    await prepareSanctum();
    return window.axios.get(`api/${path}`);
}

export async function publisherPost(path, body) {
    await prepareSanctum();
    return window.axios.post(`api/${path}`, body);
}

export async function publisherPut(path, body) {
    await prepareSanctum();
    return window.axios.put(`api/${path}`, body);
}

export async function publisherDelete(path) {
    await prepareSanctum();
    return window.axios.delete(`api/${path}`);
}

export function formatInr(amount) {
    const n = Number(amount);
    if (Number.isNaN(n)) {
        return '₹0';
    }
    try {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
    } catch {
        return `₹${n.toFixed(0)}`;
    }
}

export function formatInrFull(amount) {
    const n = Number(amount);
    if (Number.isNaN(n)) {
        return '₹0.00';
    }
    try {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(n);
    } catch {
        return `₹${n.toFixed(2)}`;
    }
}

export function formatCompact(n) {
    const x = Number(n);
    if (Number.isNaN(x)) {
        return '0';
    }
    if (x >= 100000) {
        return `${(x / 100000).toFixed(1)}L`;
    }
    if (x >= 1000) {
        return `${(x / 1000).toFixed(1)}k`;
    }
    return String(x);
}

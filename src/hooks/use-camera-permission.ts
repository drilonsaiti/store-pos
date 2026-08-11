'use client';

import {useEffect, useState} from 'react';

export type CameraPermissionState = 'unknown' | 'granted' | 'denied' | 'prompt';

/**
 * Reads the browser's current camera permission where the Permissions API
 * supports querying it (Chrome/Edge/Firefox — not Safari).
 *
 * IMPORTANT: a website cannot make a browser "remember" camera access —
 * that's entirely the browser's job, and it already does this automatically
 * per secure, stable origin. Chrome/Edge/Firefox persist a grant forever for
 * a given https:// origin (or exactly "localhost"). If access is being
 * re-requested on every visit, the most common cause is testing at an
 * address that changes or isn't a secure/stable origin — a LAN IP that
 * changes, mixing "localhost" and "127.0.0.1", or plain http:// on a non-
 * localhost address. Each counts as a different origin to the browser and
 * will always re-prompt. Deploying behind one fixed HTTPS domain fixes this
 * — there's no code-level workaround for the browser's own security model.
 */
export function useCameraPermission() {
    const [state, setState] = useState<CameraPermissionState>('unknown');

    useEffect(() => {
        if (!navigator.permissions?.query) return;
        let permissionStatus: PermissionStatus | null = null;

        navigator.permissions
            .query({name: 'camera' as PermissionName})
            .then((status) => {
                permissionStatus = status;
                setState(status.state as CameraPermissionState);
                status.onchange = () => setState(status.state as CameraPermissionState);
            })
            .catch(() => setState('unknown'));

        return () => {
            if (permissionStatus) permissionStatus.onchange = null;
        };
    }, []);

    return state;
}
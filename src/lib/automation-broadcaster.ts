import { pusherServer } from './pusher';
import { logger } from './logger';

export async function notifyDoctorUpdates(updates: Array<{ id: string | number }>) {
    try {
        await pusherServer.trigger('medcore-dashboard', 'doctors-update', updates);
        logger.info('[Pusher] Emitted doctors-update');
    } catch (e: any) {
        logger.error(`[Pusher] Emit error: ${e.message}`);
    }
}

export async function notifyViaSocket(event: string, data: any) {
    try {
        await pusherServer.trigger('medcore-dashboard', event, data);
    } catch (e: any) {
        logger.error(`[Pusher] Emit event ${event} error: ${e.message}`);
    }
}

export async function syncAdminData(snapshot: any) {
    try {
        await pusherServer.trigger('medcore-dashboard', 'admin_sync_all', snapshot);
    } catch (e: any) {
        logger.error(`[Pusher] Emit admin_sync_all error: ${e.message}`);
    }
}

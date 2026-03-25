import * as udp from 'dgram';
import type { Logger } from 'homebridge';

/**
 * Try to find a Spa on the network automatically, using UDP broadcast.
 * Returns a cancel function that stops the discovery interval.
 * @param log 
 * @param foundSpaCallback call with the ip address of any Spa found on the network
 */
export function discoverSpas(log: Logger, foundSpaCallback: (ip: string) => void): () => void {
    const discoveryFunction = () => {
        const client = udp.createSocket({ type: 'udp4', reuseAddr: true });
        let closed = false;

        const safeClose = () => {
            if (!closed) {
                closed = true;
                try { client.close(); } catch (_) { /* already closed */ }
            }
        };

        const host = '255.255.255.255';
        const port = 30303;
        const timeout = 10000;

        client.on('error', (err: any) => {
            log.debug('UDP socket error:', err.message);
            safeClose();
        });

        client.on('message', (msg: any, info: any) => {
            log.debug('UDP Data received from server :', msg.toString());
            log.debug('UDP Received %d bytes from %s:%d', msg.length, info.address, info.port);
            if (msg.length >= 6 && msg.slice(0,6) == 'BWGSPA') {
                log.info('Discovered a Spa at', info.address);
                clearInterval(broadcastIntervalId);
                foundSpaCallback(info.address);
            }
        });

        const data = Buffer.from('Discovery: Who is out there?');

        client.bind(() => {
            client.setBroadcast(true);
        });

        client.send(data, port, host, (error: any) => {
            if (error) {
                log.debug('UDP discovery broadcast failed:', error.message);
                safeClose();
            } else {
                log.debug('UDP discovery broadcast message sent - attempting to find a spa');
            }
        });

        setTimeout(() => {
            log.debug('Closing spa discovery search');
            safeClose();
        }, timeout);

    };

    // Try every 20 seconds to discover the Spa, waiting 10 seconds each time for a response.
    const broadcastIntervalId = setInterval(discoveryFunction, 20 * 1000);
    // But start immediately.
    log.info("Searching for spa on the local network - will re-broadcast every 20 seconds until success.");
    discoveryFunction();

    return () => { clearInterval(broadcastIntervalId); };
}

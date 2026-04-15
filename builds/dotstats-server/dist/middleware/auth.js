const ADMIN_API_KEY = process.env.ADMIN_API_KEY;
export async function adminAuth(request, reply) {
    if (!ADMIN_API_KEY) {
        reply.status(403).send({ error: 'Admin API not configured' });
        return;
    }
    const token = request.headers['x-admin-key']
        || request.query?.admin_key;
    if (!token || token !== ADMIN_API_KEY) {
        reply.status(401).send({ error: 'Unauthorized: invalid or missing admin key' });
        return;
    }
}

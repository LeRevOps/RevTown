/**
 * @leclaw/core — HubSpot Search
 *
 * The foundation of every LeClaw agent.
 * Fetches ONLY broken records — never full CRM scans.
 *
 * filterGroups follow HubSpot native format:
 *   - Outer array = OR logic between groups
 *   - Inner filters array = AND logic within a group
 *
 * @example
 * // Contacts missing email OR missing name
 * searchHubSpot(token, "contacts", [
 *   { filters: [{ propertyName: "email", operator: "NOT_HAS_PROPERTY" }] },
 *   { filters: [{ propertyName: "firstname", operator: "NOT_HAS_PROPERTY" }] },
 * ], ["email", "firstname"], async (records) => {
 *   console.log(records);
 * });
 */
export async function searchHubSpot(token, objectType, filterGroups, properties, onBatch) {
    const url = `https://api.hubapi.com/crm/v3/objects/${objectType}/search`;
    let after;
    let totalFetched = 0;
    while (true) {
        const body = { filterGroups, properties, limit: 100 };
        if (after)
            body.after = after;
        const res = await fetch(url, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            throw new Error(`HubSpot search failed (${objectType}): ${res.status} ${await res.text()}`);
        }
        const data = await res.json();
        const records = data.results ?? [];
        totalFetched += records.length;
        if (records.length > 0)
            await onBatch(records, totalFetched);
        const nextCursor = data.paging?.next?.after;
        if (!nextCursor)
            break;
        after = nextCursor;
    }
    return { total: totalFetched };
}

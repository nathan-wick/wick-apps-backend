import { lookup } from "geoip-lite";

const getLocationFromIp = (ipAddress?: string) => {
    const unknownLocation = `Unknown`;

    if (!ipAddress) {
        return unknownLocation;
    }

    const geo = lookup(ipAddress);

    if (!geo) {
        return unknownLocation;
    }

    const location = `${geo.city}, ${geo.region}, ${geo.country}`;

    return location;
};

export default getLocationFromIp;
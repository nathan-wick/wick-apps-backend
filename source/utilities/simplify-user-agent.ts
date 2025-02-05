import { parse } from "useragent";

const simplifyUserAgent = (userAgent?: string) => {
    const unknownUserAgent = `Unknown`;

    if (!userAgent) {
        return unknownUserAgent;
    }

    const parsedUserAgent = parse(userAgent);
    const simplifiedUserAgent = `${parsedUserAgent.family} ${parsedUserAgent.os}`;
    
    return simplifiedUserAgent;
};

export default simplifyUserAgent;
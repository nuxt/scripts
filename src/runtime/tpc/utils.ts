

export function getPropertiesFromObject(obj: Record<string, any>, properties: string[]): Record<string, any> {
    return properties.reduce<Record<string, any>>((acc, key) => {
        if (obj[key] !== undefined) {
            acc[key] = obj[key];
        }
        return acc;
    }
    , {});
}
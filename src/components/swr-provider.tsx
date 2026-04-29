'use client';

import { SWRConfig } from 'swr';
export const SWRProvider = ({ children }: { children: React.ReactNode }) => {

    return (
        <SWRConfig
            value={{
                fetcher: async (resource, init) => {
                    const res = await fetch(resource, init);
                    const data = await res.json();
                    if (!res.ok) {
                        throw new Error(data.error || 'An error occurred while fetching the data.');
                    }
                    return data;
                },
                revalidateOnFocus: true
            }}
        >
            {children}
        </SWRConfig>
    );
};

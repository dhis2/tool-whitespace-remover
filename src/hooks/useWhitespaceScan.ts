import { useDataEngine } from '@dhis2/app-runtime'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { MetadataItem, MetadataMap } from '@/types/metadata'
import { hasWhitespaceIssue } from '@/utils/whitespace'

const FIELDS = 'id,name,shortName,code,description'

// The API cannot filter on whitespace in shortName (token index limitation),
// so shortName issues are only found on objects matched via other fields.
const FILTERED_FIELDS = ['name', 'code', 'description']

// ilike '  '  -> repeated whitespace anywhere
// $ilike ' '  -> leading whitespace
// ilike$ ' '  -> trailing whitespace
const buildFilters = (field: string): string[] => [
    `${field}:ilike:  `,
    `${field}:$ilike: `,
    `${field}:ilike$: `,
]

const mergeResponses = (responses: Record<string, unknown>[]): MetadataMap => {
    const merged: MetadataMap = {}
    for (const response of responses) {
        for (const [type, value] of Object.entries(response)) {
            if (type === 'system' || !Array.isArray(value)) {
                continue
            }
            merged[type] = (merged[type] ?? []).concat(value as MetadataItem[])
        }
    }
    for (const type of Object.keys(merged)) {
        const seen = new Set<string>()
        merged[type] = merged[type].filter((item) => {
            if (seen.has(item.id) || !hasWhitespaceIssue(item)) {
                return false
            }
            seen.add(item.id)
            return true
        })
        if (merged[type].length === 0) {
            delete merged[type]
        }
    }
    return merged
}

/**
 * Scans all metadata for whitespace issues in name, code and description
 * (one /api/metadata call per field/pattern combination) and returns the
 * matching objects grouped by metadata type.
 */
export const useWhitespaceScan = () => {
    const engine = useDataEngine()
    const [progress, setProgress] = useState(0)

    const query = useQuery<MetadataMap, Error>(
        ['whitespace-scan'],
        async () => {
            const filters = FILTERED_FIELDS.flatMap(buildFilters)
            let completed = 0
            setProgress(0)
            const responses = await Promise.all(
                filters.map(async (filter) => {
                    const response = await engine.query({
                        metadata: {
                            resource: 'metadata',
                            params: { filter, fields: FIELDS },
                        },
                    })
                    completed += 1
                    setProgress(completed / filters.length)
                    return response.metadata as Record<string, unknown>
                })
            )
            return mergeResponses(responses)
        },
        {
            staleTime: Infinity,
            cacheTime: Infinity,
            refetchOnWindowFocus: false,
            retry: 1,
        }
    )

    return { ...query, progress }
}

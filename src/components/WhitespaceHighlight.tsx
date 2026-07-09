import React, { ReactNode } from 'react'
import styles from './WhitespaceHighlight.module.css'

const WHITESPACE_PATTERN = /(^\s+)|(\s+$)|(\s{2,})/g

/**
 * Renders a metadata value in quotes, with the problematic whitespace
 * (leading, trailing, repeated) highlighted.
 */
export const WhitespaceHighlight = ({ value }: { value?: string }) => {
    if (value === undefined || value === '') {
        return null
    }
    const segments: ReactNode[] = []
    let last = 0
    for (const match of value.matchAll(WHITESPACE_PATTERN)) {
        const index = match.index ?? 0
        if (index > last) {
            segments.push(value.slice(last, index))
        }
        segments.push(
            <mark key={index} className={styles.whitespace}>
                {match[0]}
            </mark>
        )
        last = index + match[0].length
    }
    if (last < value.length) {
        segments.push(value.slice(last))
    }
    return (
        <span className={styles.value}>
            &quot;{segments}
            &quot;
        </span>
    )
}

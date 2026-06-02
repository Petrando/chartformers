import React from "react";

type ChevronProps = React.SVGProps<SVGSVGElement>;

export const ChevronLeft = (props: ChevronProps) => (
    <svg
        width={24}
        height={24}
        viewBox="0 0 24 24"
        fill="none"
        {...props}
    >
        <path
            d="M15 5L8 12L15 19"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

export const ChevronUp = (props: ChevronProps) => (
    <svg
        width={24}
        height={24}
        viewBox="0 0 24 24"
        fill="none"
        {...props}
    >
        <path
            d="M5 15L12 8L19 15"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

export const ChevronRight = (props: ChevronProps) => (
    <svg
        width={24}
        height={24}
        viewBox="0 0 24 24"
        fill="none"
        {...props}
    >
        <path
            d="M9 5L16 12L9 19"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);
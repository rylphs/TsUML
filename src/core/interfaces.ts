export interface MethodDetails {
    name: string;
}

export interface PropertyDetails {
    name: string;
    type: string;
    tracked: boolean;
}

export interface HeritageClause {
    clause: string;
    className: string;
}

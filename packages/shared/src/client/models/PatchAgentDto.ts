/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type PatchAgentDto = {
    /**
     * Core instructions/persona for this agent
     */
    systemPrompt?: string;
    /**
     * Task statuses that will trigger this agent to activate
     */
    statusTriggers?: Array<'NOT_STARTED' | 'IN_PROGRESS' | 'FOR_REVIEW' | 'DONE'>;
};


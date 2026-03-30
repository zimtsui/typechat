import { RWLock } from '@zimtsui/typelocks';


export interface InferenceContext {
    busy?: RWLock;
    signal?: AbortSignal;
    cost?(deltaCost: number): void;
}

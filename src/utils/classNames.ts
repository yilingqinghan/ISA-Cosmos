export default function cx(...xs:(string|false|undefined|null)[]){return xs.filter(Boolean).join(' ')}

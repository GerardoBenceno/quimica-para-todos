// Claves de almacenamiento local, con el slug técnico neutro de la app.
export const STORAGE_PREFIX = 'quimica_app'
export const KEY_USER_ID = `${STORAGE_PREFIX}:anon_user_id`
export const keyUserState = (userId: string) => `${STORAGE_PREFIX}:state:${userId}`
export const KEY_PREFS = `${STORAGE_PREFIX}:prefs`
export const KEY_EDITOR_DRAFT = `${STORAGE_PREFIX}:editor_draft`

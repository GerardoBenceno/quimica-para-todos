import { useBundle } from '../stores/contentStore'
import { useT } from '../services/i18nHooks'
import { Carbo } from '../ui/Carbo'
import { ChemText } from '../ui/ChemText'
import { OptionsView } from './OptionsView'
import type { ExerciseViewProps } from './types'

/** Mensaje del personaje que el usuario completa eligiendo una opción. */
export function ChatCompleteView(props: ExerciseViewProps) {
  const t = useT()
  const b = useBundle()
  const charId = props.exercise.payload.character_id
  const character = b.characters.find((c) => c.id === charId)
  return (
    <div className="chat">
      <div className="chat-row">
        <Carbo characterId={charId} expression="think" size={48} />
        <div className="chat-bubble">
          {character && <div className="chat-name">{t(character.name_key)}</div>}
          <p id={props.promptId}>
            <ChemText text={t(props.exercise.prompt_key)} />
          </p>
        </div>
      </div>
      <OptionsView {...props} />
    </div>
  )
}

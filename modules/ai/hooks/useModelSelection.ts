import { useMemo } from 'react'
import modelsList from '@/modules/ai/lib/models.json'
import templates from '@/modules/templates/lib/templates'

export function useModelSelection(languageModel: { model?: string }) {
  // Filter models based on environment settings
  const filteredModels = useMemo(() => {
    return modelsList.models.filter((model) => {
      if (process.env.NEXT_PUBLIC_HIDE_LOCAL_MODELS) {
        return model.providerId !== 'ollama'
      }
      return true
    })
  }, [])
  
  // Get current model with fallback
  const currentModel = useMemo(() => {
    return filteredModels.find(
      (model) => model.id === languageModel.model,
    ) || filteredModels[0]
  }, [filteredModels, languageModel.model])
  
  // Get template configuration
  const currentTemplate = templates
  
  return {
    filteredModels,
    currentModel,
    currentTemplate,
    templates
  }
}
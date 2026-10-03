import { claveServicio } from './config';
import { appUrl } from './db';

/** Repositorio público de donde la PC servidor descarga el programa de WhatsApp. */
export const REPO_GITHUB = process.env.TASKING_REPO || 'soyhank/tasking';

export function comandoInstalarWorker() {
  return `$env:TASKING_URL='${appUrl()}'; $env:TASKING_KEY='${claveServicio()}'; irm https://raw.githubusercontent.com/${REPO_GITHUB}/main/worker/instalar.ps1 | iex`;
}

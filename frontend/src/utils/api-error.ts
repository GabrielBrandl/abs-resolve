import axios from 'axios';

/** Extrai mensagem legível de erros Axios / API */
export function mensagemErroApi(err: unknown, fallback = 'Ocorreu um erro. Tente novamente.') {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: string; message?: string } | undefined;
    if (data?.error) return tornarAmigavel(data.error);
    if (data?.message) return tornarAmigavel(data.message);
    if (err.response?.status === 400) {
      return 'Faltam alguns campos a serem selecionados. Revise as opções e tente novamente.';
    }
    if (err.response?.status === 401) return 'Sessão expirada. Faça login novamente.';
    if (err.response?.status === 403) return 'Você não tem permissão para esta ação.';
    if (err.response?.status === 404) return 'Registro não encontrado.';
    if (err.response?.status === 429) return 'Muitas tentativas. Aguarde um momento.';
    if (!err.response) return 'Sem conexão com o servidor. Verifique sua internet.';
  }
  if (err instanceof Error && err.message) return tornarAmigavel(err.message);
  return fallback;
}

function tornarAmigavel(msg: string) {
  if (/request failed with status code 400/i.test(msg)) {
    return 'Faltam alguns campos a serem selecionados. Revise as opções e tente novamente.';
  }
  if (/request failed with status code/i.test(msg)) {
    return 'Não foi possível concluir a ação. Tente novamente.';
  }
  if (/slug de fluxo não suportado/i.test(msg)) {
    return 'Este serviço ainda não está disponível para orçamento online. Escolha outro ou fale conosco.';
  }
  return msg;
}

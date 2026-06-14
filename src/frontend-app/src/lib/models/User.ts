export interface User {
  id: number;
  login: string;
  email: string;
  cpf: string;
  dat_nas: string;
  num_tel: string;
  role: string;
}

export interface UserFormData {
  id: number;
  login: string;
  email: string;
  senha?: string;
  confirmarSenha?:string
  cpf: string;
  dat_nas: string;
  num_tel: string;
  role: string;
}

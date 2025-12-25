export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agendamentos: {
        Row: {
          cliente_id: string
          created_at: string
          data_hora: string
          duracao_minutos: number
          id: string
          observacoes: string | null
          profissional_id: string
          servico_id: string
          status: string
          updated_at: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data_hora: string
          duracao_minutos: number
          id?: string
          observacoes?: string | null
          profissional_id: string
          servico_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data_hora?: string
          duracao_minutos?: number
          id?: string
          observacoes?: string | null
          profissional_id?: string
          servico_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agendamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profissionais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      atendimento_produtos: {
        Row: {
          atendimento_id: string
          created_at: string
          id: string
          preco_unitario: number
          produto_id: string
          quantidade: number
          subtotal: number
        }
        Insert: {
          atendimento_id: string
          created_at?: string
          id?: string
          preco_unitario: number
          produto_id: string
          quantidade?: number
          subtotal: number
        }
        Update: {
          atendimento_id?: string
          created_at?: string
          id?: string
          preco_unitario?: number
          produto_id?: string
          quantidade?: number
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "atendimento_produtos_atendimento_id_fkey"
            columns: ["atendimento_id"]
            isOneToOne: false
            referencedRelation: "atendimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atendimento_produtos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      atendimento_servicos: {
        Row: {
          atendimento_id: string
          comissao_percentual: number
          comissao_valor: number
          created_at: string
          id: string
          preco_unitario: number
          profissional_id: string
          quantidade: number
          servico_id: string
          subtotal: number
        }
        Insert: {
          atendimento_id: string
          comissao_percentual: number
          comissao_valor: number
          created_at?: string
          id?: string
          preco_unitario: number
          profissional_id: string
          quantidade?: number
          servico_id: string
          subtotal: number
        }
        Update: {
          atendimento_id?: string
          comissao_percentual?: number
          comissao_valor?: number
          created_at?: string
          id?: string
          preco_unitario?: number
          profissional_id?: string
          quantidade?: number
          servico_id?: string
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "atendimento_servicos_atendimento_id_fkey"
            columns: ["atendimento_id"]
            isOneToOne: false
            referencedRelation: "atendimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atendimento_servicos_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profissionais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atendimento_servicos_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      atendimentos: {
        Row: {
          cliente_id: string | null
          created_at: string
          data_hora: string
          desconto: number
          id: string
          nota_fiscal_id: string | null
          nota_fiscal_solicitada: boolean
          numero_comanda: number
          observacoes: string | null
          status: string
          subtotal: number
          updated_at: string
          valor_final: number
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          data_hora?: string
          desconto?: number
          id?: string
          nota_fiscal_id?: string | null
          nota_fiscal_solicitada?: boolean
          numero_comanda?: number
          observacoes?: string | null
          status?: string
          subtotal?: number
          updated_at?: string
          valor_final?: number
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          data_hora?: string
          desconto?: number
          id?: string
          nota_fiscal_id?: string | null
          nota_fiscal_solicitada?: boolean
          numero_comanda?: number
          observacoes?: string | null
          status?: string
          subtotal?: number
          updated_at?: string
          valor_final?: number
        }
        Relationships: [
          {
            foreignKeyName: "atendimentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atendimentos_nota_fiscal_id_fkey"
            columns: ["nota_fiscal_id"]
            isOneToOne: false
            referencedRelation: "notas_fiscais"
            referencedColumns: ["id"]
          },
        ]
      }
      caixa: {
        Row: {
          created_at: string
          data_abertura: string
          data_fechamento: string | null
          diferenca: number | null
          id: string
          observacoes_abertura: string | null
          observacoes_fechamento: string | null
          status: string
          updated_at: string
          valor_esperado: number | null
          valor_final: number | null
          valor_inicial: number
        }
        Insert: {
          created_at?: string
          data_abertura?: string
          data_fechamento?: string | null
          diferenca?: number | null
          id?: string
          observacoes_abertura?: string | null
          observacoes_fechamento?: string | null
          status?: string
          updated_at?: string
          valor_esperado?: number | null
          valor_final?: number | null
          valor_inicial?: number
        }
        Update: {
          created_at?: string
          data_abertura?: string
          data_fechamento?: string | null
          diferenca?: number | null
          id?: string
          observacoes_abertura?: string | null
          observacoes_fechamento?: string | null
          status?: string
          updated_at?: string
          valor_esperado?: number | null
          valor_final?: number | null
          valor_inicial?: number
        }
        Relationships: []
      }
      caixa_movimentacoes: {
        Row: {
          atendimento_id: string | null
          caixa_id: string
          categoria: string | null
          data_hora: string
          descricao: string
          forma_pagamento: string | null
          id: string
          tipo: string
          valor: number
        }
        Insert: {
          atendimento_id?: string | null
          caixa_id: string
          categoria?: string | null
          data_hora?: string
          descricao: string
          forma_pagamento?: string | null
          id?: string
          tipo: string
          valor: number
        }
        Update: {
          atendimento_id?: string | null
          caixa_id?: string
          categoria?: string | null
          data_hora?: string
          descricao?: string
          forma_pagamento?: string | null
          id?: string
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "caixa_movimentacoes_atendimento_id_fkey"
            columns: ["atendimento_id"]
            isOneToOne: false
            referencedRelation: "atendimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caixa_movimentacoes_caixa_id_fkey"
            columns: ["caixa_id"]
            isOneToOne: false
            referencedRelation: "caixa"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          ativo: boolean
          bairro: string | null
          celular: string
          cep: string | null
          cidade: string | null
          complemento: string | null
          cpf: string | null
          created_at: string
          data_nascimento: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          foto_url: string | null
          id: string
          nome: string
          numero: string | null
          observacoes: string | null
          sempre_emitir_nf: boolean
          telefone: string | null
          total_visitas: number
          ultima_visita: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          bairro?: string | null
          celular: string
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          foto_url?: string | null
          id?: string
          nome: string
          numero?: string | null
          observacoes?: string | null
          sempre_emitir_nf?: boolean
          telefone?: string | null
          total_visitas?: number
          ultima_visita?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          bairro?: string | null
          celular?: string
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          foto_url?: string | null
          id?: string
          nome?: string
          numero?: string | null
          observacoes?: string | null
          sempre_emitir_nf?: boolean
          telefone?: string | null
          total_visitas?: number
          ultima_visita?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      configuracoes_fiscal: {
        Row: {
          aliquota_icms: number | null
          aliquota_iss: number | null
          ambiente: string
          api_provider: string | null
          api_token: string | null
          auto_emitir_cnpj: boolean
          auto_emitir_cpf: boolean
          auto_emitir_flag: boolean
          auto_enviar_email: boolean
          auto_enviar_sms: boolean
          certificado_digital_path: string | null
          certificado_senha: string | null
          cfop_produtos: string | null
          cfop_servicos: string | null
          cnpj: string
          comportamento_emissao: string
          created_at: string
          dias_permitir_emissao: number
          email: string | null
          emissao_automatica: boolean | null
          empresa_nome_fantasia: string | null
          empresa_razao_social: string
          endereco_bairro: string | null
          endereco_cep: string | null
          endereco_cidade: string | null
          endereco_complemento: string | null
          endereco_logradouro: string | null
          endereco_numero: string | null
          endereco_uf: string | null
          envio_email_automatico: boolean | null
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          notificar_erro_equipe: boolean
          numero_proximo_nfce: number
          numero_proximo_nfe: number
          observacoes_padrao: string | null
          regime_tributario: string
          serie_nfce: number
          serie_nfe: number
          sugerir_emissao_marcado: boolean
          telefone: string | null
          tipo_emissao_automatica: string | null
          updated_at: string
          valor_sugerir_emissao: number
        }
        Insert: {
          aliquota_icms?: number | null
          aliquota_iss?: number | null
          ambiente?: string
          api_provider?: string | null
          api_token?: string | null
          auto_emitir_cnpj?: boolean
          auto_emitir_cpf?: boolean
          auto_emitir_flag?: boolean
          auto_enviar_email?: boolean
          auto_enviar_sms?: boolean
          certificado_digital_path?: string | null
          certificado_senha?: string | null
          cfop_produtos?: string | null
          cfop_servicos?: string | null
          cnpj: string
          comportamento_emissao?: string
          created_at?: string
          dias_permitir_emissao?: number
          email?: string | null
          emissao_automatica?: boolean | null
          empresa_nome_fantasia?: string | null
          empresa_razao_social: string
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_complemento?: string | null
          endereco_logradouro?: string | null
          endereco_numero?: string | null
          endereco_uf?: string | null
          envio_email_automatico?: boolean | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          notificar_erro_equipe?: boolean
          numero_proximo_nfce?: number
          numero_proximo_nfe?: number
          observacoes_padrao?: string | null
          regime_tributario?: string
          serie_nfce?: number
          serie_nfe?: number
          sugerir_emissao_marcado?: boolean
          telefone?: string | null
          tipo_emissao_automatica?: string | null
          updated_at?: string
          valor_sugerir_emissao?: number
        }
        Update: {
          aliquota_icms?: number | null
          aliquota_iss?: number | null
          ambiente?: string
          api_provider?: string | null
          api_token?: string | null
          auto_emitir_cnpj?: boolean
          auto_emitir_cpf?: boolean
          auto_emitir_flag?: boolean
          auto_enviar_email?: boolean
          auto_enviar_sms?: boolean
          certificado_digital_path?: string | null
          certificado_senha?: string | null
          cfop_produtos?: string | null
          cfop_servicos?: string | null
          cnpj?: string
          comportamento_emissao?: string
          created_at?: string
          dias_permitir_emissao?: number
          email?: string | null
          emissao_automatica?: boolean | null
          empresa_nome_fantasia?: string | null
          empresa_razao_social?: string
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_complemento?: string | null
          endereco_logradouro?: string | null
          endereco_numero?: string | null
          endereco_uf?: string | null
          envio_email_automatico?: boolean | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          notificar_erro_equipe?: boolean
          numero_proximo_nfce?: number
          numero_proximo_nfe?: number
          observacoes_padrao?: string | null
          regime_tributario?: string
          serie_nfce?: number
          serie_nfe?: number
          sugerir_emissao_marcado?: boolean
          telefone?: string | null
          tipo_emissao_automatica?: string | null
          updated_at?: string
          valor_sugerir_emissao?: number
        }
        Relationships: []
      }
      contas_pagar: {
        Row: {
          anexo_url: string | null
          categoria: string
          created_at: string
          data_pagamento: string | null
          data_vencimento: string
          descricao: string
          forma_pagamento: string | null
          id: string
          observacoes: string | null
          status: string
          updated_at: string
          valor: number
        }
        Insert: {
          anexo_url?: string | null
          categoria?: string
          created_at?: string
          data_pagamento?: string | null
          data_vencimento: string
          descricao: string
          forma_pagamento?: string | null
          id?: string
          observacoes?: string | null
          status?: string
          updated_at?: string
          valor: number
        }
        Update: {
          anexo_url?: string | null
          categoria?: string
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string
          descricao?: string
          forma_pagamento?: string | null
          id?: string
          observacoes?: string | null
          status?: string
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      contas_receber: {
        Row: {
          atendimento_id: string | null
          cliente_id: string | null
          created_at: string
          data_recebimento: string | null
          data_vencimento: string
          descricao: string
          forma_pagamento: string | null
          id: string
          observacoes: string | null
          status: string
          updated_at: string
          valor: number
        }
        Insert: {
          atendimento_id?: string | null
          cliente_id?: string | null
          created_at?: string
          data_recebimento?: string | null
          data_vencimento: string
          descricao: string
          forma_pagamento?: string | null
          id?: string
          observacoes?: string | null
          status?: string
          updated_at?: string
          valor: number
        }
        Update: {
          atendimento_id?: string | null
          cliente_id?: string | null
          created_at?: string
          data_recebimento?: string | null
          data_vencimento?: string
          descricao?: string
          forma_pagamento?: string | null
          id?: string
          observacoes?: string | null
          status?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "contas_receber_atendimento_id_fkey"
            columns: ["atendimento_id"]
            isOneToOne: false
            referencedRelation: "atendimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      despesas_rapidas: {
        Row: {
          caixa_id: string | null
          categoria: string
          data_hora: string
          descricao: string
          id: string
          observacoes: string | null
          pago_por: string
          valor: number
        }
        Insert: {
          caixa_id?: string | null
          categoria: string
          data_hora?: string
          descricao: string
          id?: string
          observacoes?: string | null
          pago_por?: string
          valor: number
        }
        Update: {
          caixa_id?: string | null
          categoria?: string
          data_hora?: string
          descricao?: string
          id?: string
          observacoes?: string | null
          pago_por?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "despesas_rapidas_caixa_id_fkey"
            columns: ["caixa_id"]
            isOneToOne: false
            referencedRelation: "caixa"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_nota_fiscal: {
        Row: {
          aliquota_icms: number | null
          aliquota_iss: number | null
          cfop: string
          codigo: string | null
          created_at: string
          descricao: string
          id: string
          ncm: string | null
          nota_fiscal_id: string
          quantidade: number
          tipo: string
          unidade: string | null
          valor_desconto: number | null
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          aliquota_icms?: number | null
          aliquota_iss?: number | null
          cfop: string
          codigo?: string | null
          created_at?: string
          descricao: string
          id?: string
          ncm?: string | null
          nota_fiscal_id: string
          quantidade?: number
          tipo: string
          unidade?: string | null
          valor_desconto?: number | null
          valor_total: number
          valor_unitario: number
        }
        Update: {
          aliquota_icms?: number | null
          aliquota_iss?: number | null
          cfop?: string
          codigo?: string | null
          created_at?: string
          descricao?: string
          id?: string
          ncm?: string | null
          nota_fiscal_id?: string
          quantidade?: number
          tipo?: string
          unidade?: string | null
          valor_desconto?: number | null
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "itens_nota_fiscal_nota_fiscal_id_fkey"
            columns: ["nota_fiscal_id"]
            isOneToOne: false
            referencedRelation: "notas_fiscais"
            referencedColumns: ["id"]
          },
        ]
      }
      notas_fiscais: {
        Row: {
          atendimento_id: string | null
          base_calculo_icms: number | null
          base_calculo_iss: number | null
          chave_acesso: string | null
          cliente_cpf_cnpj: string | null
          cliente_endereco: string | null
          cliente_id: string | null
          cliente_nome: string | null
          created_at: string
          data_autorizacao: string | null
          data_cancelamento: string | null
          data_emissao: string
          id: string
          motivo_rejeicao: string | null
          numero: number
          observacoes: string | null
          pdf_path: string | null
          protocolo: string | null
          serie: number
          status: string
          tipo: string
          updated_at: string
          valor_desconto: number | null
          valor_icms: number | null
          valor_iss: number | null
          valor_produtos: number | null
          valor_servicos: number | null
          valor_total: number
          xml_path: string | null
        }
        Insert: {
          atendimento_id?: string | null
          base_calculo_icms?: number | null
          base_calculo_iss?: number | null
          chave_acesso?: string | null
          cliente_cpf_cnpj?: string | null
          cliente_endereco?: string | null
          cliente_id?: string | null
          cliente_nome?: string | null
          created_at?: string
          data_autorizacao?: string | null
          data_cancelamento?: string | null
          data_emissao?: string
          id?: string
          motivo_rejeicao?: string | null
          numero: number
          observacoes?: string | null
          pdf_path?: string | null
          protocolo?: string | null
          serie: number
          status?: string
          tipo: string
          updated_at?: string
          valor_desconto?: number | null
          valor_icms?: number | null
          valor_iss?: number | null
          valor_produtos?: number | null
          valor_servicos?: number | null
          valor_total?: number
          xml_path?: string | null
        }
        Update: {
          atendimento_id?: string | null
          base_calculo_icms?: number | null
          base_calculo_iss?: number | null
          chave_acesso?: string | null
          cliente_cpf_cnpj?: string | null
          cliente_endereco?: string | null
          cliente_id?: string | null
          cliente_nome?: string | null
          created_at?: string
          data_autorizacao?: string | null
          data_cancelamento?: string | null
          data_emissao?: string
          id?: string
          motivo_rejeicao?: string | null
          numero?: number
          observacoes?: string | null
          pdf_path?: string | null
          protocolo?: string | null
          serie?: number
          status?: string
          tipo?: string
          updated_at?: string
          valor_desconto?: number | null
          valor_icms?: number | null
          valor_iss?: number | null
          valor_produtos?: number | null
          valor_servicos?: number | null
          valor_total?: number
          xml_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notas_fiscais_atendimento_id_fkey"
            columns: ["atendimento_id"]
            isOneToOne: false
            referencedRelation: "atendimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_fiscais_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamentos: {
        Row: {
          atendimento_id: string
          data_hora: string
          forma_pagamento: string
          id: string
          parcelas: number
          valor: number
        }
        Insert: {
          atendimento_id: string
          data_hora?: string
          forma_pagamento: string
          id?: string
          parcelas?: number
          valor: number
        }
        Update: {
          atendimento_id?: string
          data_hora?: string
          forma_pagamento?: string
          id?: string
          parcelas?: number
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_atendimento_id_fkey"
            columns: ["atendimento_id"]
            isOneToOne: false
            referencedRelation: "atendimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean
          categoria: string | null
          codigo_barras: string | null
          created_at: string
          descricao: string | null
          estoque_atual: number
          estoque_minimo: number
          foto_url: string | null
          id: string
          nome: string
          preco_custo: number | null
          preco_venda: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          codigo_barras?: string | null
          created_at?: string
          descricao?: string | null
          estoque_atual?: number
          estoque_minimo?: number
          foto_url?: string | null
          id?: string
          nome: string
          preco_custo?: number | null
          preco_venda: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          codigo_barras?: string | null
          created_at?: string
          descricao?: string | null
          estoque_atual?: number
          estoque_minimo?: number
          foto_url?: string | null
          id?: string
          nome?: string
          preco_custo?: number | null
          preco_venda?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          foto_url: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          foto_url?: string | null
          id: string
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          foto_url?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      profissionais: {
        Row: {
          ativo: boolean
          bairro: string | null
          cep: string | null
          cidade: string | null
          comissao_padrao: number
          comissao_produtos: number
          comissao_servicos: number
          cor_agenda: string
          cpf: string | null
          created_at: string
          data_admissao: string | null
          endereco: string | null
          especialidade: string | null
          estado: string | null
          foto_url: string | null
          funcao: string | null
          id: string
          meta_produtos_mes: number
          meta_servicos_mes: number
          nome: string
          pode_vender_produtos: boolean
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          comissao_padrao?: number
          comissao_produtos?: number
          comissao_servicos?: number
          cor_agenda?: string
          cpf?: string | null
          created_at?: string
          data_admissao?: string | null
          endereco?: string | null
          especialidade?: string | null
          estado?: string | null
          foto_url?: string | null
          funcao?: string | null
          id?: string
          meta_produtos_mes?: number
          meta_servicos_mes?: number
          nome: string
          pode_vender_produtos?: boolean
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          comissao_padrao?: number
          comissao_produtos?: number
          comissao_servicos?: number
          cor_agenda?: string
          cpf?: string | null
          created_at?: string
          data_admissao?: string | null
          endereco?: string | null
          especialidade?: string | null
          estado?: string | null
          foto_url?: string | null
          funcao?: string | null
          id?: string
          meta_produtos_mes?: number
          meta_servicos_mes?: number
          nome?: string
          pode_vender_produtos?: boolean
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profissional_metas_historico: {
        Row: {
          created_at: string
          id: string
          mes_referencia: string
          meta_produtos: number
          meta_servicos: number
          premio_produtos: string | null
          premio_servicos: string | null
          profissional_id: string
          realizado_produtos: number
          realizado_servicos: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          mes_referencia: string
          meta_produtos?: number
          meta_servicos?: number
          premio_produtos?: string | null
          premio_servicos?: string | null
          profissional_id: string
          realizado_produtos?: number
          realizado_servicos?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          mes_referencia?: string
          meta_produtos?: number
          meta_servicos?: number
          premio_produtos?: string | null
          premio_servicos?: string | null
          profissional_id?: string
          realizado_produtos?: number
          realizado_servicos?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profissional_metas_historico_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profissionais"
            referencedColumns: ["id"]
          },
        ]
      }
      servicos: {
        Row: {
          ativo: boolean
          categoria: string | null
          comissao_padrao: number
          created_at: string
          descricao: string | null
          duracao_minutos: number
          id: string
          nome: string
          preco: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          comissao_padrao?: number
          created_at?: string
          descricao?: string | null
          duracao_minutos?: number
          id?: string
          nome: string
          preco: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          comissao_padrao?: number
          created_at?: string
          descricao?: string | null
          duracao_minutos?: number
          id?: string
          nome?: string
          preco?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["nivel_acesso"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["nivel_acesso"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["nivel_acesso"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["nivel_acesso"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["nivel_acesso"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      nivel_acesso: "admin" | "gerente" | "operador"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      nivel_acesso: ["admin", "gerente", "operador"],
    },
  },
} as const

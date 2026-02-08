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
      cheques: {
        Row: {
          agencia: string | null
          atendimento_id: string | null
          banco: string | null
          caixa_id: string | null
          cliente_id: string | null
          conta: string | null
          cpf_cnpj_emitente: string | null
          created_at: string
          data_compensacao: string | null
          data_devolucao: string | null
          data_emissao: string
          data_vencimento: string
          emitente: string
          id: string
          motivo_devolucao: string | null
          numero_cheque: string
          observacoes: string | null
          status: string
          updated_at: string
          valor: number
        }
        Insert: {
          agencia?: string | null
          atendimento_id?: string | null
          banco?: string | null
          caixa_id?: string | null
          cliente_id?: string | null
          conta?: string | null
          cpf_cnpj_emitente?: string | null
          created_at?: string
          data_compensacao?: string | null
          data_devolucao?: string | null
          data_emissao?: string
          data_vencimento: string
          emitente: string
          id?: string
          motivo_devolucao?: string | null
          numero_cheque: string
          observacoes?: string | null
          status?: string
          updated_at?: string
          valor: number
        }
        Update: {
          agencia?: string | null
          atendimento_id?: string | null
          banco?: string | null
          caixa_id?: string | null
          cliente_id?: string | null
          conta?: string | null
          cpf_cnpj_emitente?: string | null
          created_at?: string
          data_compensacao?: string | null
          data_devolucao?: string | null
          data_emissao?: string
          data_vencimento?: string
          emitente?: string
          id?: string
          motivo_devolucao?: string | null
          numero_cheque?: string
          observacoes?: string | null
          status?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "cheques_atendimento_id_fkey"
            columns: ["atendimento_id"]
            isOneToOne: false
            referencedRelation: "atendimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cheques_caixa_id_fkey"
            columns: ["caixa_id"]
            isOneToOne: false
            referencedRelation: "caixa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cheques_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          allow_email_marketing: boolean | null
          allow_notifications: boolean | null
          allow_whatsapp_marketing: boolean | null
          ativo: boolean
          bairro: string | null
          celular: string
          cep: string | null
          cidade: string | null
          complemento: string | null
          cpf: string | null
          created_at: string
          data_nascimento: string | null
          dia_vencimento_crediario: number | null
          elegivel_crediario: boolean | null
          email: string | null
          endereco: string | null
          estado: string | null
          foto_updated_at: string | null
          foto_url: string | null
          id: string
          limite_crediario: number | null
          nome: string
          numero: string | null
          observacoes: string | null
          receber_mensagens: boolean
          sempre_emitir_nf: boolean
          telefone: string | null
          total_visitas: number
          ultima_visita: string | null
          updated_at: string
        }
        Insert: {
          allow_email_marketing?: boolean | null
          allow_notifications?: boolean | null
          allow_whatsapp_marketing?: boolean | null
          ativo?: boolean
          bairro?: string | null
          celular: string
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          dia_vencimento_crediario?: number | null
          elegivel_crediario?: boolean | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          foto_updated_at?: string | null
          foto_url?: string | null
          id?: string
          limite_crediario?: number | null
          nome: string
          numero?: string | null
          observacoes?: string | null
          receber_mensagens?: boolean
          sempre_emitir_nf?: boolean
          telefone?: string | null
          total_visitas?: number
          ultima_visita?: string | null
          updated_at?: string
        }
        Update: {
          allow_email_marketing?: boolean | null
          allow_notifications?: boolean | null
          allow_whatsapp_marketing?: boolean | null
          ativo?: boolean
          bairro?: string | null
          celular?: string
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          dia_vencimento_crediario?: number | null
          elegivel_crediario?: boolean | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          foto_updated_at?: string | null
          foto_url?: string | null
          id?: string
          limite_crediario?: number | null
          nome?: string
          numero?: string | null
          observacoes?: string | null
          receber_mensagens?: boolean
          sempre_emitir_nf?: boolean
          telefone?: string | null
          total_visitas?: number
          ultima_visita?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      comunicacao_avaliacoes: {
        Row: {
          atendimento_id: string | null
          cliente_id: string | null
          comentario: string | null
          created_at: string
          id: string
          nota: number
          respondida: boolean
        }
        Insert: {
          atendimento_id?: string | null
          cliente_id?: string | null
          comentario?: string | null
          created_at?: string
          id?: string
          nota: number
          respondida?: boolean
        }
        Update: {
          atendimento_id?: string | null
          cliente_id?: string | null
          comentario?: string | null
          created_at?: string
          id?: string
          nota?: number
          respondida?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "comunicacao_avaliacoes_atendimento_id_fkey"
            columns: ["atendimento_id"]
            isOneToOne: false
            referencedRelation: "atendimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comunicacao_avaliacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      comunicacao_campanhas: {
        Row: {
          ativo: boolean
          created_at: string
          criterio_dias_inativo: number | null
          data_fim: string | null
          data_inicio: string | null
          desconto_oferecido: number | null
          descricao: string | null
          id: string
          nome: string
          template_mensagem: string
          tipo_segmentacao: string
          total_enviados: number
          total_respondidos: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          criterio_dias_inativo?: number | null
          data_fim?: string | null
          data_inicio?: string | null
          desconto_oferecido?: number | null
          descricao?: string | null
          id?: string
          nome: string
          template_mensagem: string
          tipo_segmentacao: string
          total_enviados?: number
          total_respondidos?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          criterio_dias_inativo?: number | null
          data_fim?: string | null
          data_inicio?: string | null
          desconto_oferecido?: number | null
          descricao?: string | null
          id?: string
          nome?: string
          template_mensagem?: string
          tipo_segmentacao?: string
          total_enviados?: number
          total_respondidos?: number
          updated_at?: string
        }
        Relationships: []
      }
      comunicacao_config_avancadas: {
        Row: {
          created_at: string
          fallback_sms: boolean
          foto_perfil_url: string | null
          horario_silencio_fim: string
          horario_silencio_inicio: string
          id: string
          limite_diario_mensagens: number
          nome_remetente: string | null
          opt_out_keyword: string
          sms_api_key: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          fallback_sms?: boolean
          foto_perfil_url?: string | null
          horario_silencio_fim?: string
          horario_silencio_inicio?: string
          id?: string
          limite_diario_mensagens?: number
          nome_remetente?: string | null
          opt_out_keyword?: string
          sms_api_key?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          fallback_sms?: boolean
          foto_perfil_url?: string | null
          horario_silencio_fim?: string
          horario_silencio_inicio?: string
          id?: string
          limite_diario_mensagens?: number
          nome_remetente?: string | null
          opt_out_keyword?: string
          sms_api_key?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      comunicacao_creditos: {
        Row: {
          alerta_creditos_minimo: number
          created_at: string
          custo_por_mensagem: number
          id: string
          saldo_creditos: number
          updated_at: string
        }
        Insert: {
          alerta_creditos_minimo?: number
          created_at?: string
          custo_por_mensagem?: number
          id?: string
          saldo_creditos?: number
          updated_at?: string
        }
        Update: {
          alerta_creditos_minimo?: number
          created_at?: string
          custo_por_mensagem?: number
          id?: string
          saldo_creditos?: number
          updated_at?: string
        }
        Relationships: []
      }
      comunicacao_estatisticas: {
        Row: {
          agendamentos_cancelados: number
          agendamentos_confirmados: number
          created_at: string
          data: string
          falhas_envio: number
          id: string
          mensagens_entregues: number
          mensagens_enviadas: number
          mensagens_lidas: number
          mensagens_respondidas: number
        }
        Insert: {
          agendamentos_cancelados?: number
          agendamentos_confirmados?: number
          created_at?: string
          data?: string
          falhas_envio?: number
          id?: string
          mensagens_entregues?: number
          mensagens_enviadas?: number
          mensagens_lidas?: number
          mensagens_respondidas?: number
        }
        Update: {
          agendamentos_cancelados?: number
          agendamentos_confirmados?: number
          created_at?: string
          data?: string
          falhas_envio?: number
          id?: string
          mensagens_entregues?: number
          mensagens_enviadas?: number
          mensagens_lidas?: number
          mensagens_respondidas?: number
        }
        Relationships: []
      }
      comunicacao_lembretes: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          horario_envio: string | null
          horas_antes: number
          id: string
          incluir_endereco: boolean
          nome: string
          template_mensagem: string
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          horario_envio?: string | null
          horas_antes?: number
          id?: string
          incluir_endereco?: boolean
          nome: string
          template_mensagem: string
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          horario_envio?: string | null
          horas_antes?: number
          id?: string
          incluir_endereco?: boolean
          nome?: string
          template_mensagem?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      comunicacao_recargas: {
        Row: {
          created_at: string
          creditos_adquiridos: number
          forma_pagamento: string | null
          id: string
          status: string
          valor: number
        }
        Insert: {
          created_at?: string
          creditos_adquiridos: number
          forma_pagamento?: string | null
          id?: string
          status?: string
          valor: number
        }
        Update: {
          created_at?: string
          creditos_adquiridos?: number
          forma_pagamento?: string | null
          id?: string
          status?: string
          valor?: number
        }
        Relationships: []
      }
      comunicacao_respostas_automaticas: {
        Row: {
          acao: string | null
          ativo: boolean
          created_at: string
          id: string
          mensagem_resposta: string
          palavras_chave: string[]
          prioridade: number
          tipo_resposta: string
          updated_at: string
        }
        Insert: {
          acao?: string | null
          ativo?: boolean
          created_at?: string
          id?: string
          mensagem_resposta: string
          palavras_chave: string[]
          prioridade?: number
          tipo_resposta: string
          updated_at?: string
        }
        Update: {
          acao?: string | null
          ativo?: boolean
          created_at?: string
          id?: string
          mensagem_resposta?: string
          palavras_chave?: string[]
          prioridade?: number
          tipo_resposta?: string
          updated_at?: string
        }
        Relationships: []
      }
      comunicacao_templates_prontos: {
        Row: {
          ativo: boolean
          created_at: string
          estilo: string
          id: string
          mensagem: string
          nome: string
          tipo: string
          variaveis: string[]
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          estilo: string
          id?: string
          mensagem: string
          nome: string
          tipo: string
          variaveis?: string[]
        }
        Update: {
          ativo?: boolean
          created_at?: string
          estilo?: string
          id?: string
          mensagem?: string
          nome?: string
          tipo?: string
          variaveis?: string[]
        }
        Relationships: []
      }
      configuracoes_aparencia: {
        Row: {
          animacoes_reduzidas: boolean | null
          cor_accent_custom: string | null
          cor_destaque: string
          cor_primaria: string
          cor_secundaria: string
          created_at: string
          id: string
          modo_alto_contraste: boolean | null
          tema: string
          tipografia_grande: boolean | null
          updated_at: string
        }
        Insert: {
          animacoes_reduzidas?: boolean | null
          cor_accent_custom?: string | null
          cor_destaque?: string
          cor_primaria?: string
          cor_secundaria?: string
          created_at?: string
          id?: string
          modo_alto_contraste?: boolean | null
          tema?: string
          tipografia_grande?: boolean | null
          updated_at?: string
        }
        Update: {
          animacoes_reduzidas?: boolean | null
          cor_accent_custom?: string | null
          cor_destaque?: string
          cor_primaria?: string
          cor_secundaria?: string
          created_at?: string
          id?: string
          modo_alto_contraste?: boolean | null
          tema?: string
          tipografia_grande?: boolean | null
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
      configuracoes_kiosk: {
        Row: {
          agenda_intervalo_tempo: string | null
          agenda_modo_privacidade: boolean | null
          agenda_mostrar_nomes_servicos: boolean | null
          agenda_profissionais_visiveis: string[] | null
          agenda_somente_leitura: boolean | null
          agenda_visivel: boolean | null
          alvos_touch_grandes: boolean | null
          apenas_touch: boolean | null
          auto_relancar_se_fechado: boolean | null
          bloquear_arraste_janela: boolean | null
          bloquear_atalhos_sistema: boolean | null
          bloquear_posicao_janela: boolean | null
          bloquear_tamanho_janela: boolean | null
          created_at: string
          desabilitar_teclado: boolean | null
          forcar_fullscreen: boolean | null
          fundo_tipo: string | null
          fundo_valor: string | null
          id: string
          logo_animacao: string | null
          logo_animacao_velocidade: number | null
          logo_url: string | null
          modulo_comandas_abertas: boolean | null
          modulo_espelho_caixa: boolean | null
          modulo_mini_agenda: boolean | null
          modulo_ponto: boolean | null
          modulo_tela_espera: boolean | null
          ocultar_controles_janela: boolean | null
          ponto_habilitado: boolean | null
          ponto_metodo: string | null
          ponto_mostrar_foto_nome: boolean | null
          ponto_prevenir_duplicados: boolean | null
          ponto_requer_confirmacao: boolean | null
          rotas_habilitadas: Json | null
          tema_kiosk: string | null
          tipografia_grande: boolean | null
          ultimo_acesso_rotas: Json | null
          updated_at: string
        }
        Insert: {
          agenda_intervalo_tempo?: string | null
          agenda_modo_privacidade?: boolean | null
          agenda_mostrar_nomes_servicos?: boolean | null
          agenda_profissionais_visiveis?: string[] | null
          agenda_somente_leitura?: boolean | null
          agenda_visivel?: boolean | null
          alvos_touch_grandes?: boolean | null
          apenas_touch?: boolean | null
          auto_relancar_se_fechado?: boolean | null
          bloquear_arraste_janela?: boolean | null
          bloquear_atalhos_sistema?: boolean | null
          bloquear_posicao_janela?: boolean | null
          bloquear_tamanho_janela?: boolean | null
          created_at?: string
          desabilitar_teclado?: boolean | null
          forcar_fullscreen?: boolean | null
          fundo_tipo?: string | null
          fundo_valor?: string | null
          id?: string
          logo_animacao?: string | null
          logo_animacao_velocidade?: number | null
          logo_url?: string | null
          modulo_comandas_abertas?: boolean | null
          modulo_espelho_caixa?: boolean | null
          modulo_mini_agenda?: boolean | null
          modulo_ponto?: boolean | null
          modulo_tela_espera?: boolean | null
          ocultar_controles_janela?: boolean | null
          ponto_habilitado?: boolean | null
          ponto_metodo?: string | null
          ponto_mostrar_foto_nome?: boolean | null
          ponto_prevenir_duplicados?: boolean | null
          ponto_requer_confirmacao?: boolean | null
          rotas_habilitadas?: Json | null
          tema_kiosk?: string | null
          tipografia_grande?: boolean | null
          ultimo_acesso_rotas?: Json | null
          updated_at?: string
        }
        Update: {
          agenda_intervalo_tempo?: string | null
          agenda_modo_privacidade?: boolean | null
          agenda_mostrar_nomes_servicos?: boolean | null
          agenda_profissionais_visiveis?: string[] | null
          agenda_somente_leitura?: boolean | null
          agenda_visivel?: boolean | null
          alvos_touch_grandes?: boolean | null
          apenas_touch?: boolean | null
          auto_relancar_se_fechado?: boolean | null
          bloquear_arraste_janela?: boolean | null
          bloquear_atalhos_sistema?: boolean | null
          bloquear_posicao_janela?: boolean | null
          bloquear_tamanho_janela?: boolean | null
          created_at?: string
          desabilitar_teclado?: boolean | null
          forcar_fullscreen?: boolean | null
          fundo_tipo?: string | null
          fundo_valor?: string | null
          id?: string
          logo_animacao?: string | null
          logo_animacao_velocidade?: number | null
          logo_url?: string | null
          modulo_comandas_abertas?: boolean | null
          modulo_espelho_caixa?: boolean | null
          modulo_mini_agenda?: boolean | null
          modulo_ponto?: boolean | null
          modulo_tela_espera?: boolean | null
          ocultar_controles_janela?: boolean | null
          ponto_habilitado?: boolean | null
          ponto_metodo?: string | null
          ponto_mostrar_foto_nome?: boolean | null
          ponto_prevenir_duplicados?: boolean | null
          ponto_requer_confirmacao?: boolean | null
          rotas_habilitadas?: Json | null
          tema_kiosk?: string | null
          tipografia_grande?: boolean | null
          ultimo_acesso_rotas?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      configuracoes_notificacoes: {
        Row: {
          alerta_admin_ativo: boolean | null
          alerta_caixa_baixo_valor: number | null
          alerta_estoque_ativo: boolean | null
          alerta_estoque_minimo: number | null
          alerta_financeiro_ativo: boolean | null
          aniversario_ativo: boolean | null
          aniversario_dias_antes: number | null
          aniversario_template: string | null
          canal_email: boolean | null
          canal_in_app: boolean | null
          canal_sms: boolean | null
          canal_whatsapp: boolean | null
          cancelamento_ativo: boolean | null
          cancelamento_template: string | null
          confirmacao_ativa: boolean | null
          confirmacao_horas_antes: number | null
          confirmacao_template: string | null
          created_at: string
          horario_silencio_ativo: boolean | null
          horario_silencio_fim: string | null
          horario_silencio_inicio: string | null
          id: string
          lembrete_24h: boolean | null
          lembrete_2h: boolean | null
          lembrete_template: string | null
          sistema_ativo: boolean | null
          sistema_sons: boolean | null
          updated_at: string
        }
        Insert: {
          alerta_admin_ativo?: boolean | null
          alerta_caixa_baixo_valor?: number | null
          alerta_estoque_ativo?: boolean | null
          alerta_estoque_minimo?: number | null
          alerta_financeiro_ativo?: boolean | null
          aniversario_ativo?: boolean | null
          aniversario_dias_antes?: number | null
          aniversario_template?: string | null
          canal_email?: boolean | null
          canal_in_app?: boolean | null
          canal_sms?: boolean | null
          canal_whatsapp?: boolean | null
          cancelamento_ativo?: boolean | null
          cancelamento_template?: string | null
          confirmacao_ativa?: boolean | null
          confirmacao_horas_antes?: number | null
          confirmacao_template?: string | null
          created_at?: string
          horario_silencio_ativo?: boolean | null
          horario_silencio_fim?: string | null
          horario_silencio_inicio?: string | null
          id?: string
          lembrete_24h?: boolean | null
          lembrete_2h?: boolean | null
          lembrete_template?: string | null
          sistema_ativo?: boolean | null
          sistema_sons?: boolean | null
          updated_at?: string
        }
        Update: {
          alerta_admin_ativo?: boolean | null
          alerta_caixa_baixo_valor?: number | null
          alerta_estoque_ativo?: boolean | null
          alerta_estoque_minimo?: number | null
          alerta_financeiro_ativo?: boolean | null
          aniversario_ativo?: boolean | null
          aniversario_dias_antes?: number | null
          aniversario_template?: string | null
          canal_email?: boolean | null
          canal_in_app?: boolean | null
          canal_sms?: boolean | null
          canal_whatsapp?: boolean | null
          cancelamento_ativo?: boolean | null
          cancelamento_template?: string | null
          confirmacao_ativa?: boolean | null
          confirmacao_horas_antes?: number | null
          confirmacao_template?: string | null
          created_at?: string
          horario_silencio_ativo?: boolean | null
          horario_silencio_fim?: string | null
          horario_silencio_inicio?: string | null
          id?: string
          lembrete_24h?: boolean | null
          lembrete_2h?: boolean | null
          lembrete_template?: string | null
          sistema_ativo?: boolean | null
          sistema_sons?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      configuracoes_salao: {
        Row: {
          cnpj: string | null
          created_at: string
          email: string | null
          endereco_bairro: string | null
          endereco_cep: string | null
          endereco_cidade: string | null
          endereco_complemento: string | null
          endereco_estado: string | null
          endereco_logradouro: string | null
          endereco_numero: string | null
          facebook: string | null
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          instagram: string | null
          logo_updated_at: string | null
          logo_url: string | null
          nome_fantasia: string | null
          nome_salao: string
          site: string | null
          telefone_principal: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_complemento?: string | null
          endereco_estado?: string | null
          endereco_logradouro?: string | null
          endereco_numero?: string | null
          facebook?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          instagram?: string | null
          logo_updated_at?: string | null
          logo_url?: string | null
          nome_fantasia?: string | null
          nome_salao?: string
          site?: string | null
          telefone_principal?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_complemento?: string | null
          endereco_estado?: string | null
          endereco_logradouro?: string | null
          endereco_numero?: string | null
          facebook?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          instagram?: string | null
          logo_updated_at?: string | null
          logo_url?: string | null
          nome_fantasia?: string | null
          nome_salao?: string
          site?: string | null
          telefone_principal?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      configuracoes_sistema: {
        Row: {
          agenda_dias_antecedencia_max: number | null
          agenda_duracao_padrao_minutos: number | null
          agenda_horario_fim: string | null
          agenda_horario_inicio: string | null
          agenda_intervalo_minutos: number | null
          agenda_permitir_encaixe: boolean | null
          ambiente: string | null
          backup_criptografado: boolean | null
          backup_formato_padrao: string | null
          backup_modulos_selecionados: string[] | null
          backup_ultimo_data: string | null
          backup_ultimo_integridade: boolean | null
          backup_ultimo_tamanho_bytes: number | null
          caixa_permitir_multiplos_abertos: boolean | null
          caixa_requer_confirmacao_abertura: boolean | null
          caixa_requer_confirmacao_fechamento: boolean | null
          caixa_valor_abertura_padrao: number | null
          created_at: string
          dispositivo_modo_padrao: string | null
          id: string
          produtos_alerta_estoque_minimo: number | null
          produtos_comissao_padrao: number | null
          produtos_vendas_habilitadas: boolean | null
          servicos_comissao_padrao: number | null
          updated_at: string
          versao_atual: string | null
        }
        Insert: {
          agenda_dias_antecedencia_max?: number | null
          agenda_duracao_padrao_minutos?: number | null
          agenda_horario_fim?: string | null
          agenda_horario_inicio?: string | null
          agenda_intervalo_minutos?: number | null
          agenda_permitir_encaixe?: boolean | null
          ambiente?: string | null
          backup_criptografado?: boolean | null
          backup_formato_padrao?: string | null
          backup_modulos_selecionados?: string[] | null
          backup_ultimo_data?: string | null
          backup_ultimo_integridade?: boolean | null
          backup_ultimo_tamanho_bytes?: number | null
          caixa_permitir_multiplos_abertos?: boolean | null
          caixa_requer_confirmacao_abertura?: boolean | null
          caixa_requer_confirmacao_fechamento?: boolean | null
          caixa_valor_abertura_padrao?: number | null
          created_at?: string
          dispositivo_modo_padrao?: string | null
          id?: string
          produtos_alerta_estoque_minimo?: number | null
          produtos_comissao_padrao?: number | null
          produtos_vendas_habilitadas?: boolean | null
          servicos_comissao_padrao?: number | null
          updated_at?: string
          versao_atual?: string | null
        }
        Update: {
          agenda_dias_antecedencia_max?: number | null
          agenda_duracao_padrao_minutos?: number | null
          agenda_horario_fim?: string | null
          agenda_horario_inicio?: string | null
          agenda_intervalo_minutos?: number | null
          agenda_permitir_encaixe?: boolean | null
          ambiente?: string | null
          backup_criptografado?: boolean | null
          backup_formato_padrao?: string | null
          backup_modulos_selecionados?: string[] | null
          backup_ultimo_data?: string | null
          backup_ultimo_integridade?: boolean | null
          backup_ultimo_tamanho_bytes?: number | null
          caixa_permitir_multiplos_abertos?: boolean | null
          caixa_requer_confirmacao_abertura?: boolean | null
          caixa_requer_confirmacao_fechamento?: boolean | null
          caixa_valor_abertura_padrao?: number | null
          created_at?: string
          dispositivo_modo_padrao?: string | null
          id?: string
          produtos_alerta_estoque_minimo?: number | null
          produtos_comissao_padrao?: number | null
          produtos_vendas_habilitadas?: boolean | null
          servicos_comissao_padrao?: number | null
          updated_at?: string
          versao_atual?: string | null
        }
        Relationships: []
      }
      configuracoes_taxa_falta: {
        Row: {
          aplicacao_taxa: string
          cobrar_taxa: boolean
          comportamento_cancelamento_tardio: string
          comportamento_sem_confirmacao: string
          created_at: string
          horario_fim_envio: string
          horario_inicio_envio: string
          id: string
          intervalo_reenvio_minutos: number
          notificar_cancelamento: boolean
          notificar_confirmacao: boolean
          notificar_sem_resposta: boolean
          prazo_confirmacao_horas: number
          prazo_minimo_cancelamento_horas: number
          tentar_reenvio: boolean
          tentativas_reenvio: number
          updated_at: string
          valor_taxa: number
        }
        Insert: {
          aplicacao_taxa?: string
          cobrar_taxa?: boolean
          comportamento_cancelamento_tardio?: string
          comportamento_sem_confirmacao?: string
          created_at?: string
          horario_fim_envio?: string
          horario_inicio_envio?: string
          id?: string
          intervalo_reenvio_minutos?: number
          notificar_cancelamento?: boolean
          notificar_confirmacao?: boolean
          notificar_sem_resposta?: boolean
          prazo_confirmacao_horas?: number
          prazo_minimo_cancelamento_horas?: number
          tentar_reenvio?: boolean
          tentativas_reenvio?: number
          updated_at?: string
          valor_taxa?: number
        }
        Update: {
          aplicacao_taxa?: string
          cobrar_taxa?: boolean
          comportamento_cancelamento_tardio?: string
          comportamento_sem_confirmacao?: string
          created_at?: string
          horario_fim_envio?: string
          horario_inicio_envio?: string
          id?: string
          intervalo_reenvio_minutos?: number
          notificar_cancelamento?: boolean
          notificar_confirmacao?: boolean
          notificar_sem_resposta?: boolean
          prazo_confirmacao_horas?: number
          prazo_minimo_cancelamento_horas?: number
          tentar_reenvio?: boolean
          tentativas_reenvio?: number
          updated_at?: string
          valor_taxa?: number
        }
        Relationships: []
      }
      configuracoes_whatsapp: {
        Row: {
          api_provider: string
          api_token: string | null
          api_url: string | null
          created_at: string
          id: string
          numero_whatsapp: string | null
          qrcode_conectado: boolean
          sessao_ativa: boolean
          updated_at: string
        }
        Insert: {
          api_provider?: string
          api_token?: string | null
          api_url?: string | null
          created_at?: string
          id?: string
          numero_whatsapp?: string | null
          qrcode_conectado?: boolean
          sessao_ativa?: boolean
          updated_at?: string
        }
        Update: {
          api_provider?: string
          api_token?: string | null
          api_url?: string | null
          created_at?: string
          id?: string
          numero_whatsapp?: string | null
          qrcode_conectado?: boolean
          sessao_ativa?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      confirmacoes_agendamento: {
        Row: {
          agendamento_id: string
          cancelado_em: string | null
          confirmado_em: string | null
          created_at: string
          id: string
          ip_confirmacao: string | null
          link_confirmacao: string | null
          observacao_cancelamento: string | null
          status: string
          taxa_aplicada: boolean
          token_confirmacao: string
          valor_taxa: number | null
        }
        Insert: {
          agendamento_id: string
          cancelado_em?: string | null
          confirmado_em?: string | null
          created_at?: string
          id?: string
          ip_confirmacao?: string | null
          link_confirmacao?: string | null
          observacao_cancelamento?: string | null
          status?: string
          taxa_aplicada?: boolean
          token_confirmacao: string
          valor_taxa?: number | null
        }
        Update: {
          agendamento_id?: string
          cancelado_em?: string | null
          confirmado_em?: string | null
          created_at?: string
          id?: string
          ip_confirmacao?: string | null
          link_confirmacao?: string | null
          observacao_cancelamento?: string | null
          status?: string
          taxa_aplicada?: boolean
          token_confirmacao?: string
          valor_taxa?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "confirmacoes_agendamento_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: true
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
        ]
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
      conversas_whatsapp: {
        Row: {
          arquivada: boolean
          atendente_id: string | null
          cliente_id: string | null
          created_at: string
          etiqueta: string | null
          favorita: boolean
          foto_url: string | null
          id: string
          nao_lidas: number
          nome_contato: string
          status: string
          telefone: string
          ultima_mensagem: string | null
          ultima_mensagem_hora: string | null
          updated_at: string
        }
        Insert: {
          arquivada?: boolean
          atendente_id?: string | null
          cliente_id?: string | null
          created_at?: string
          etiqueta?: string | null
          favorita?: boolean
          foto_url?: string | null
          id?: string
          nao_lidas?: number
          nome_contato: string
          status?: string
          telefone: string
          ultima_mensagem?: string | null
          ultima_mensagem_hora?: string | null
          updated_at?: string
        }
        Update: {
          arquivada?: boolean
          atendente_id?: string | null
          cliente_id?: string | null
          created_at?: string
          etiqueta?: string | null
          favorita?: boolean
          foto_url?: string | null
          id?: string
          nao_lidas?: number
          nome_contato?: string
          status?: string
          telefone?: string
          ultima_mensagem?: string | null
          ultima_mensagem_hora?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversas_whatsapp_cliente_id_fkey"
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
      dispositivos_registrados: {
        Row: {
          ativo: boolean | null
          created_at: string
          device_id: string
          id: string
          ip_address: string | null
          nome: string
          tipo: string
          ultimo_acesso: string | null
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          device_id: string
          id?: string
          ip_address?: string | null
          nome: string
          tipo?: string
          ultimo_acesso?: string | null
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          device_id?: string
          id?: string
          ip_address?: string | null
          nome?: string
          tipo?: string
          ultimo_acesso?: string | null
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      dividas: {
        Row: {
          atendimento_id: string | null
          cliente_id: string
          created_at: string
          data_origem: string
          data_ultima_notificacao: string | null
          data_vencimento: string
          id: string
          notificacao_enviada: boolean | null
          observacoes: string | null
          saldo: number
          status: string
          updated_at: string
          valor_original: number
          valor_pago: number
        }
        Insert: {
          atendimento_id?: string | null
          cliente_id: string
          created_at?: string
          data_origem?: string
          data_ultima_notificacao?: string | null
          data_vencimento: string
          id?: string
          notificacao_enviada?: boolean | null
          observacoes?: string | null
          saldo: number
          status?: string
          updated_at?: string
          valor_original: number
          valor_pago?: number
        }
        Update: {
          atendimento_id?: string | null
          cliente_id?: string
          created_at?: string
          data_origem?: string
          data_ultima_notificacao?: string | null
          data_vencimento?: string
          id?: string
          notificacao_enviada?: boolean | null
          observacoes?: string | null
          saldo?: number
          status?: string
          updated_at?: string
          valor_original?: number
          valor_pago?: number
        }
        Relationships: [
          {
            foreignKeyName: "dividas_atendimento_id_fkey"
            columns: ["atendimento_id"]
            isOneToOne: false
            referencedRelation: "atendimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dividas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      dividas_pagamentos: {
        Row: {
          created_at: string
          created_by: string | null
          data_pagamento: string
          desconto: number | null
          divida_id: string
          forma_pagamento: string
          id: string
          juros: number | null
          observacoes: string | null
          valor: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_pagamento?: string
          desconto?: number | null
          divida_id: string
          forma_pagamento: string
          id?: string
          juros?: number | null
          observacoes?: string | null
          valor: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_pagamento?: string
          desconto?: number | null
          divida_id?: string
          forma_pagamento?: string
          id?: string
          juros?: number | null
          observacoes?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "dividas_pagamentos_divida_id_fkey"
            columns: ["divida_id"]
            isOneToOne: false
            referencedRelation: "dividas"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_funcionarios: {
        Row: {
          created_at: string
          data_upload: string | null
          funcionario_id: string
          id: string
          nome_arquivo: string
          observacoes: string | null
          tipo: string
          url: string
        }
        Insert: {
          created_at?: string
          data_upload?: string | null
          funcionario_id: string
          id?: string
          nome_arquivo: string
          observacoes?: string | null
          tipo: string
          url: string
        }
        Update: {
          created_at?: string
          data_upload?: string | null
          funcionario_id?: string
          id?: string
          nome_arquivo?: string
          observacoes?: string | null
          tipo?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_funcionarios_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      fechamentos_profissionais: {
        Row: {
          confirmado_em: string | null
          confirmado_por: string | null
          created_at: string
          fechamento_semanal_id: string
          id: string
          observacoes: string | null
          profissional_id: string
          status: string
          total_atendimentos: number | null
          total_comissoes: number | null
          total_faturamento: number | null
          total_vales: number | null
          valor_liquido: number | null
        }
        Insert: {
          confirmado_em?: string | null
          confirmado_por?: string | null
          created_at?: string
          fechamento_semanal_id: string
          id?: string
          observacoes?: string | null
          profissional_id: string
          status?: string
          total_atendimentos?: number | null
          total_comissoes?: number | null
          total_faturamento?: number | null
          total_vales?: number | null
          valor_liquido?: number | null
        }
        Update: {
          confirmado_em?: string | null
          confirmado_por?: string | null
          created_at?: string
          fechamento_semanal_id?: string
          id?: string
          observacoes?: string | null
          profissional_id?: string
          status?: string
          total_atendimentos?: number | null
          total_comissoes?: number | null
          total_faturamento?: number | null
          total_vales?: number | null
          valor_liquido?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fechamentos_profissionais_fechamento_semanal_id_fkey"
            columns: ["fechamento_semanal_id"]
            isOneToOne: false
            referencedRelation: "fechamentos_semanais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fechamentos_profissionais_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profissionais"
            referencedColumns: ["id"]
          },
        ]
      }
      fechamentos_semanais: {
        Row: {
          ano: number
          created_at: string
          data_fim: string
          data_inicio: string
          fechado_em: string | null
          fechado_por: string | null
          id: string
          observacoes: string | null
          reaberto_em: string | null
          reaberto_por: string | null
          semana_numero: number
          status: string
          total_comissoes: number | null
          total_faturamento: number | null
          total_liquido: number | null
          total_produtos_valor: number | null
          total_servicos: number | null
          total_vales: number | null
          updated_at: string
        }
        Insert: {
          ano: number
          created_at?: string
          data_fim: string
          data_inicio: string
          fechado_em?: string | null
          fechado_por?: string | null
          id?: string
          observacoes?: string | null
          reaberto_em?: string | null
          reaberto_por?: string | null
          semana_numero: number
          status?: string
          total_comissoes?: number | null
          total_faturamento?: number | null
          total_liquido?: number | null
          total_produtos_valor?: number | null
          total_servicos?: number | null
          total_vales?: number | null
          updated_at?: string
        }
        Update: {
          ano?: number
          created_at?: string
          data_fim?: string
          data_inicio?: string
          fechado_em?: string | null
          fechado_por?: string | null
          id?: string
          observacoes?: string | null
          reaberto_em?: string | null
          reaberto_por?: string | null
          semana_numero?: number
          status?: string
          total_comissoes?: number | null
          total_faturamento?: number | null
          total_liquido?: number | null
          total_produtos_valor?: number | null
          total_servicos?: number | null
          total_vales?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      ferias_funcionarios: {
        Row: {
          abono_pecuniario: boolean | null
          created_at: string
          data_fim_ferias: string | null
          data_inicio_ferias: string | null
          dias_abono: number | null
          dias_direito: number | null
          dias_gozados: number | null
          funcionario_id: string
          id: string
          observacoes: string | null
          periodo_aquisitivo_fim: string
          periodo_aquisitivo_inicio: string
          status: string
          terco_constitucional: number | null
          valor_ferias: number | null
        }
        Insert: {
          abono_pecuniario?: boolean | null
          created_at?: string
          data_fim_ferias?: string | null
          data_inicio_ferias?: string | null
          dias_abono?: number | null
          dias_direito?: number | null
          dias_gozados?: number | null
          funcionario_id: string
          id?: string
          observacoes?: string | null
          periodo_aquisitivo_fim: string
          periodo_aquisitivo_inicio: string
          status?: string
          terco_constitucional?: number | null
          valor_ferias?: number | null
        }
        Update: {
          abono_pecuniario?: boolean | null
          created_at?: string
          data_fim_ferias?: string | null
          data_inicio_ferias?: string | null
          dias_abono?: number | null
          dias_direito?: number | null
          dias_gozados?: number | null
          funcionario_id?: string
          id?: string
          observacoes?: string | null
          periodo_aquisitivo_fim?: string
          periodo_aquisitivo_inicio?: string
          status?: string
          terco_constitucional?: number | null
          valor_ferias?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ferias_funcionarios_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      folhas_pagamento: {
        Row: {
          created_at: string
          data_aprovacao: string | null
          data_pagamento: string | null
          id: string
          mes_referencia: string
          observacoes: string | null
          status: string
          valor_total_bruto: number | null
          valor_total_descontos: number | null
          valor_total_liquido: number | null
        }
        Insert: {
          created_at?: string
          data_aprovacao?: string | null
          data_pagamento?: string | null
          id?: string
          mes_referencia: string
          observacoes?: string | null
          status?: string
          valor_total_bruto?: number | null
          valor_total_descontos?: number | null
          valor_total_liquido?: number | null
        }
        Update: {
          created_at?: string
          data_aprovacao?: string | null
          data_pagamento?: string | null
          id?: string
          mes_referencia?: string
          observacoes?: string | null
          status?: string
          valor_total_bruto?: number | null
          valor_total_descontos?: number | null
          valor_total_liquido?: number | null
        }
        Relationships: []
      }
      funcionarios: {
        Row: {
          agencia: string | null
          ativo: boolean | null
          banco: string | null
          cargo: string
          cargo_customizado: string | null
          cep: string | null
          conta: string | null
          cpf: string
          created_at: string
          data_admissao: string
          data_demissao: string | null
          data_nascimento: string | null
          departamento: string | null
          email: string | null
          endereco_completo: string | null
          foto_url: string | null
          id: string
          jornada_entrada: string | null
          jornada_entrada_tarde: string | null
          jornada_saida: string | null
          jornada_saida_almoco: string | null
          nome: string
          observacoes: string | null
          outros_beneficios: Json | null
          pix_chave: string | null
          pix_tipo: string | null
          plano_saude: number | null
          rg: string | null
          salario_base: number
          telefone: string | null
          tipo_conta: string | null
          tipo_contrato: string
          updated_at: string
          vale_refeicao: number | null
          vale_transporte: number | null
        }
        Insert: {
          agencia?: string | null
          ativo?: boolean | null
          banco?: string | null
          cargo?: string
          cargo_customizado?: string | null
          cep?: string | null
          conta?: string | null
          cpf: string
          created_at?: string
          data_admissao: string
          data_demissao?: string | null
          data_nascimento?: string | null
          departamento?: string | null
          email?: string | null
          endereco_completo?: string | null
          foto_url?: string | null
          id?: string
          jornada_entrada?: string | null
          jornada_entrada_tarde?: string | null
          jornada_saida?: string | null
          jornada_saida_almoco?: string | null
          nome: string
          observacoes?: string | null
          outros_beneficios?: Json | null
          pix_chave?: string | null
          pix_tipo?: string | null
          plano_saude?: number | null
          rg?: string | null
          salario_base: number
          telefone?: string | null
          tipo_conta?: string | null
          tipo_contrato?: string
          updated_at?: string
          vale_refeicao?: number | null
          vale_transporte?: number | null
        }
        Update: {
          agencia?: string | null
          ativo?: boolean | null
          banco?: string | null
          cargo?: string
          cargo_customizado?: string | null
          cep?: string | null
          conta?: string | null
          cpf?: string
          created_at?: string
          data_admissao?: string
          data_demissao?: string | null
          data_nascimento?: string | null
          departamento?: string | null
          email?: string | null
          endereco_completo?: string | null
          foto_url?: string | null
          id?: string
          jornada_entrada?: string | null
          jornada_entrada_tarde?: string | null
          jornada_saida?: string | null
          jornada_saida_almoco?: string | null
          nome?: string
          observacoes?: string | null
          outros_beneficios?: Json | null
          pix_chave?: string | null
          pix_tipo?: string | null
          plano_saude?: number | null
          rg?: string | null
          salario_base?: number
          telefone?: string | null
          tipo_conta?: string | null
          tipo_contrato?: string
          updated_at?: string
          vale_refeicao?: number | null
          vale_transporte?: number | null
        }
        Relationships: []
      }
      gorjetas: {
        Row: {
          atendimento_id: string | null
          created_at: string
          data: string
          data_repasse: string | null
          forma_repasse: string | null
          id: string
          observacoes: string | null
          profissional_id: string
          repassada: boolean
          valor: number
        }
        Insert: {
          atendimento_id?: string | null
          created_at?: string
          data?: string
          data_repasse?: string | null
          forma_repasse?: string | null
          id?: string
          observacoes?: string | null
          profissional_id: string
          repassada?: boolean
          valor?: number
        }
        Update: {
          atendimento_id?: string | null
          created_at?: string
          data?: string
          data_repasse?: string | null
          forma_repasse?: string | null
          id?: string
          observacoes?: string | null
          profissional_id?: string
          repassada?: boolean
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "gorjetas_atendimento_id_fkey"
            columns: ["atendimento_id"]
            isOneToOne: false
            referencedRelation: "atendimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gorjetas_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profissionais"
            referencedColumns: ["id"]
          },
        ]
      }
      import_logs: {
        Row: {
          agendamentos_duplicados: number | null
          agendamentos_erros: number | null
          agendamentos_importados: number | null
          arquivo_nome: string
          arquivo_tamanho: number | null
          avisos: Json | null
          clientes_duplicados: number | null
          clientes_erros: number | null
          clientes_importados: number | null
          created_at: string
          erros_detalhados: Json | null
          id: string
          origem: string
          produtos_duplicados: number | null
          produtos_erros: number | null
          produtos_importados: number | null
          profissionais_duplicados: number | null
          profissionais_erros: number | null
          profissionais_importados: number | null
          servicos_duplicados: number | null
          servicos_erros: number | null
          servicos_importados: number | null
          status: string
          sync_comissoes_recalculadas: number | null
          sync_estatisticas_atualizadas: number | null
          sync_estoque_atualizado: boolean | null
          tempo_processamento_segundos: number | null
          total_erros: number | null
          total_registros_ignorados: number | null
          total_registros_importados: number | null
          usuario_id: string | null
          vendas_duplicadas: number | null
          vendas_erros: number | null
          vendas_importadas: number | null
        }
        Insert: {
          agendamentos_duplicados?: number | null
          agendamentos_erros?: number | null
          agendamentos_importados?: number | null
          arquivo_nome: string
          arquivo_tamanho?: number | null
          avisos?: Json | null
          clientes_duplicados?: number | null
          clientes_erros?: number | null
          clientes_importados?: number | null
          created_at?: string
          erros_detalhados?: Json | null
          id?: string
          origem?: string
          produtos_duplicados?: number | null
          produtos_erros?: number | null
          produtos_importados?: number | null
          profissionais_duplicados?: number | null
          profissionais_erros?: number | null
          profissionais_importados?: number | null
          servicos_duplicados?: number | null
          servicos_erros?: number | null
          servicos_importados?: number | null
          status?: string
          sync_comissoes_recalculadas?: number | null
          sync_estatisticas_atualizadas?: number | null
          sync_estoque_atualizado?: boolean | null
          tempo_processamento_segundos?: number | null
          total_erros?: number | null
          total_registros_ignorados?: number | null
          total_registros_importados?: number | null
          usuario_id?: string | null
          vendas_duplicadas?: number | null
          vendas_erros?: number | null
          vendas_importadas?: number | null
        }
        Update: {
          agendamentos_duplicados?: number | null
          agendamentos_erros?: number | null
          agendamentos_importados?: number | null
          arquivo_nome?: string
          arquivo_tamanho?: number | null
          avisos?: Json | null
          clientes_duplicados?: number | null
          clientes_erros?: number | null
          clientes_importados?: number | null
          created_at?: string
          erros_detalhados?: Json | null
          id?: string
          origem?: string
          produtos_duplicados?: number | null
          produtos_erros?: number | null
          produtos_importados?: number | null
          profissionais_duplicados?: number | null
          profissionais_erros?: number | null
          profissionais_importados?: number | null
          servicos_duplicados?: number | null
          servicos_erros?: number | null
          servicos_importados?: number | null
          status?: string
          sync_comissoes_recalculadas?: number | null
          sync_estatisticas_atualizadas?: number | null
          sync_estoque_atualizado?: boolean | null
          tempo_processamento_segundos?: number | null
          total_erros?: number | null
          total_registros_ignorados?: number | null
          total_registros_importados?: number | null
          usuario_id?: string | null
          vendas_duplicadas?: number | null
          vendas_erros?: number | null
          vendas_importadas?: number | null
        }
        Relationships: []
      }
      itens_folha_pagamento: {
        Row: {
          adicional_noturno: number | null
          comissoes: number | null
          created_at: string
          desconto_faltas: number | null
          faltas: number | null
          folha_pagamento_id: string
          funcionario_id: string
          horas_extras: number | null
          id: string
          inss: number | null
          irrf: number | null
          observacoes: string | null
          outros_descontos: number | null
          outros_proventos: number | null
          plano_saude: number | null
          salario_base: number
          salario_liquido: number | null
          total_descontos: number | null
          total_proventos: number | null
          vale_refeicao: number | null
          vale_transporte: number | null
          valor_horas_extras: number | null
        }
        Insert: {
          adicional_noturno?: number | null
          comissoes?: number | null
          created_at?: string
          desconto_faltas?: number | null
          faltas?: number | null
          folha_pagamento_id: string
          funcionario_id: string
          horas_extras?: number | null
          id?: string
          inss?: number | null
          irrf?: number | null
          observacoes?: string | null
          outros_descontos?: number | null
          outros_proventos?: number | null
          plano_saude?: number | null
          salario_base: number
          salario_liquido?: number | null
          total_descontos?: number | null
          total_proventos?: number | null
          vale_refeicao?: number | null
          vale_transporte?: number | null
          valor_horas_extras?: number | null
        }
        Update: {
          adicional_noturno?: number | null
          comissoes?: number | null
          created_at?: string
          desconto_faltas?: number | null
          faltas?: number | null
          folha_pagamento_id?: string
          funcionario_id?: string
          horas_extras?: number | null
          id?: string
          inss?: number | null
          irrf?: number | null
          observacoes?: string | null
          outros_descontos?: number | null
          outros_proventos?: number | null
          plano_saude?: number | null
          salario_base?: number
          salario_liquido?: number | null
          total_descontos?: number | null
          total_proventos?: number | null
          vale_refeicao?: number | null
          vale_transporte?: number | null
          valor_horas_extras?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "itens_folha_pagamento_folha_pagamento_id_fkey"
            columns: ["folha_pagamento_id"]
            isOneToOne: false
            referencedRelation: "folhas_pagamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_folha_pagamento_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
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
      logs_acesso: {
        Row: {
          created_at: string
          dispositivo: string | null
          id: string
          ip_address: string | null
          motivo_falha: string | null
          nome_usuario: string
          pino_id: string | null
          role: string
          sucesso: boolean
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          dispositivo?: string | null
          id?: string
          ip_address?: string | null
          motivo_falha?: string | null
          nome_usuario: string
          pino_id?: string | null
          role: string
          sucesso?: boolean
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          dispositivo?: string | null
          id?: string
          ip_address?: string | null
          motivo_falha?: string | null
          nome_usuario?: string
          pino_id?: string | null
          role?: string
          sucesso?: boolean
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logs_acesso_pino_id_fkey"
            columns: ["pino_id"]
            isOneToOne: false
            referencedRelation: "pinos_acesso"
            referencedColumns: ["id"]
          },
        ]
      }
      mensagens_enviadas: {
        Row: {
          agendamento_id: string | null
          created_at: string
          data_entrega: string | null
          data_envio: string | null
          data_leitura: string | null
          erro_mensagem: string | null
          id: string
          mensagem_enviada: string
          status: string
          telefone_destino: string
          template_id: string | null
        }
        Insert: {
          agendamento_id?: string | null
          created_at?: string
          data_entrega?: string | null
          data_envio?: string | null
          data_leitura?: string | null
          erro_mensagem?: string | null
          id?: string
          mensagem_enviada: string
          status?: string
          telefone_destino: string
          template_id?: string | null
        }
        Update: {
          agendamento_id?: string | null
          created_at?: string
          data_entrega?: string | null
          data_envio?: string | null
          data_leitura?: string | null
          erro_mensagem?: string | null
          id?: string
          mensagem_enviada?: string
          status?: string
          telefone_destino?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_enviadas_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_enviadas_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "mensagens_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      mensagens_templates: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          mensagem: string
          tipo: string
          titulo: string
          updated_at: string
          variaveis_disponiveis: Json | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          mensagem: string
          tipo: string
          titulo: string
          updated_at?: string
          variaveis_disponiveis?: Json | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          mensagem?: string
          tipo?: string
          titulo?: string
          updated_at?: string
          variaveis_disponiveis?: Json | null
        }
        Relationships: []
      }
      mensagens_whatsapp: {
        Row: {
          conversa_id: string
          created_at: string
          enviada: boolean
          erro_mensagem: string | null
          id: string
          midia_nome: string | null
          midia_url: string | null
          status: string
          texto: string | null
          tipo: string
          wa_message_id: string | null
        }
        Insert: {
          conversa_id: string
          created_at?: string
          enviada?: boolean
          erro_mensagem?: string | null
          id?: string
          midia_nome?: string | null
          midia_url?: string | null
          status?: string
          texto?: string | null
          tipo?: string
          wa_message_id?: string | null
        }
        Update: {
          conversa_id?: string
          created_at?: string
          enviada?: boolean
          erro_mensagem?: string | null
          id?: string
          midia_nome?: string | null
          midia_url?: string | null
          status?: string
          texto?: string | null
          tipo?: string
          wa_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_whatsapp_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "conversas_whatsapp"
            referencedColumns: ["id"]
          },
        ]
      }
      metas: {
        Row: {
          alerta_100: boolean | null
          alerta_50: boolean | null
          alerta_75: boolean | null
          alerta_atraso: boolean | null
          ano: number
          ativo: boolean | null
          calculo_automatico: boolean | null
          created_at: string
          created_by: string | null
          data_fim: string
          data_inicio: string
          id: string
          mes: number | null
          nome: string
          observacoes: string | null
          percentual_crescimento: number | null
          periodo_tipo: string
          responsavel_id: string | null
          tipo: string
          unidade: string
          updated_at: string
          valor_meta: number
        }
        Insert: {
          alerta_100?: boolean | null
          alerta_50?: boolean | null
          alerta_75?: boolean | null
          alerta_atraso?: boolean | null
          ano: number
          ativo?: boolean | null
          calculo_automatico?: boolean | null
          created_at?: string
          created_by?: string | null
          data_fim: string
          data_inicio: string
          id?: string
          mes?: number | null
          nome: string
          observacoes?: string | null
          percentual_crescimento?: number | null
          periodo_tipo?: string
          responsavel_id?: string | null
          tipo: string
          unidade?: string
          updated_at?: string
          valor_meta: number
        }
        Update: {
          alerta_100?: boolean | null
          alerta_50?: boolean | null
          alerta_75?: boolean | null
          alerta_atraso?: boolean | null
          ano?: number
          ativo?: boolean | null
          calculo_automatico?: boolean | null
          created_at?: string
          created_by?: string | null
          data_fim?: string
          data_inicio?: string
          id?: string
          mes?: number | null
          nome?: string
          observacoes?: string | null
          percentual_crescimento?: number | null
          periodo_tipo?: string
          responsavel_id?: string | null
          tipo?: string
          unidade?: string
          updated_at?: string
          valor_meta?: number
        }
        Relationships: []
      }
      metas_progresso: {
        Row: {
          data: string
          id: string
          meta_id: string
          percentual: number | null
          projecao_final: number | null
          updated_at: string
          valor_atual: number | null
        }
        Insert: {
          data: string
          id?: string
          meta_id: string
          percentual?: number | null
          projecao_final?: number | null
          updated_at?: string
          valor_atual?: number | null
        }
        Update: {
          data?: string
          id?: string
          meta_id?: string
          percentual?: number | null
          projecao_final?: number | null
          updated_at?: string
          valor_atual?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "metas_progresso_meta_id_fkey"
            columns: ["meta_id"]
            isOneToOne: false
            referencedRelation: "metas"
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
      notificacoes_fila: {
        Row: {
          agendada_para: string | null
          canal: string
          created_at: string
          dados_extras: Json | null
          destinatario_id: string | null
          destinatario_tipo: string | null
          enviada_em: string | null
          erro_mensagem: string | null
          id: string
          mensagem: string
          status: string
          tentativas: number | null
          tipo: string
          titulo: string
        }
        Insert: {
          agendada_para?: string | null
          canal?: string
          created_at?: string
          dados_extras?: Json | null
          destinatario_id?: string | null
          destinatario_tipo?: string | null
          enviada_em?: string | null
          erro_mensagem?: string | null
          id?: string
          mensagem: string
          status?: string
          tentativas?: number | null
          tipo: string
          titulo: string
        }
        Update: {
          agendada_para?: string | null
          canal?: string
          created_at?: string
          dados_extras?: Json | null
          destinatario_id?: string | null
          destinatario_tipo?: string | null
          enviada_em?: string | null
          erro_mensagem?: string | null
          id?: string
          mensagem?: string
          status?: string
          tentativas?: number | null
          tipo?: string
          titulo?: string
        }
        Relationships: []
      }
      notifications_actions_log: {
        Row: {
          action_type: string
          alert_id: string | null
          channel: string | null
          created_at: string
          id: string
          payload: Json | null
          result: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action_type: string
          alert_id?: string | null
          channel?: string | null
          created_at?: string
          id?: string
          payload?: Json | null
          result?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action_type?: string
          alert_id?: string | null
          channel?: string | null
          created_at?: string
          id?: string
          payload?: Json | null
          result?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actions_log_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "notifications_alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications_alerts: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
          priority: Database["public"]["Enums"]["alert_priority"]
          resolved_at: string | null
          resolved_by: string | null
          silenced_until: string | null
          status: Database["public"]["Enums"]["alert_status"]
          title: string
          type: Database["public"]["Enums"]["alert_type"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          priority?: Database["public"]["Enums"]["alert_priority"]
          resolved_at?: string | null
          resolved_by?: string | null
          silenced_until?: string | null
          status?: Database["public"]["Enums"]["alert_status"]
          title: string
          type: Database["public"]["Enums"]["alert_type"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          priority?: Database["public"]["Enums"]["alert_priority"]
          resolved_at?: string | null
          resolved_by?: string | null
          silenced_until?: string | null
          status?: Database["public"]["Enums"]["alert_status"]
          title?: string
          type?: Database["public"]["Enums"]["alert_type"]
          updated_at?: string
        }
        Relationships: []
      }
      notifications_templates: {
        Row: {
          ativo: boolean | null
          content: string
          created_at: string
          id: string
          is_default: boolean | null
          name: string
          subject: string | null
          type: Database["public"]["Enums"]["alert_type"]
          updated_at: string
          variables: string[] | null
        }
        Insert: {
          ativo?: boolean | null
          content: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          name: string
          subject?: string | null
          type: Database["public"]["Enums"]["alert_type"]
          updated_at?: string
          variables?: string[] | null
        }
        Update: {
          ativo?: boolean | null
          content?: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          subject?: string | null
          type?: Database["public"]["Enums"]["alert_type"]
          updated_at?: string
          variables?: string[] | null
        }
        Relationships: []
      }
      ocorrencias_funcionarios: {
        Row: {
          anexos_urls: Json | null
          created_at: string
          data_ocorrencia: string
          descricao: string
          funcionario_id: string
          gravidade: string | null
          id: string
          medidas_tomadas: string | null
          tipo: string
        }
        Insert: {
          anexos_urls?: Json | null
          created_at?: string
          data_ocorrencia: string
          descricao: string
          funcionario_id: string
          gravidade?: string | null
          id?: string
          medidas_tomadas?: string | null
          tipo: string
        }
        Update: {
          anexos_urls?: Json | null
          created_at?: string
          data_ocorrencia?: string
          descricao?: string
          funcionario_id?: string
          gravidade?: string | null
          id?: string
          medidas_tomadas?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "ocorrencias_funcionarios_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
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
      permissoes_modulos: {
        Row: {
          created_at: string
          id: string
          modulo: string
          pode_editar: boolean
          pode_excluir: boolean
          pode_visualizar: boolean
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          modulo: string
          pode_editar?: boolean
          pode_excluir?: boolean
          pode_visualizar?: boolean
          role: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          modulo?: string
          pode_editar?: boolean
          pode_excluir?: boolean
          pode_visualizar?: boolean
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      pinos_acesso: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          pin: string
          role: Database["public"]["Enums"]["pin_role"]
          ultimo_acesso: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          pin: string
          role?: Database["public"]["Enums"]["pin_role"]
          ultimo_acesso?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          pin?: string
          role?: Database["public"]["Enums"]["pin_role"]
          ultimo_acesso?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ponto_funcionarios: {
        Row: {
          atestado_url: string | null
          created_at: string
          data: string
          entrada_manha: string | null
          entrada_tarde: string | null
          falta: boolean | null
          funcionario_id: string
          horas_extras: number | null
          horas_trabalhadas: number | null
          id: string
          justificada: boolean | null
          justificativa: string | null
          observacoes: string | null
          saida: string | null
          saida_almoco: string | null
        }
        Insert: {
          atestado_url?: string | null
          created_at?: string
          data: string
          entrada_manha?: string | null
          entrada_tarde?: string | null
          falta?: boolean | null
          funcionario_id: string
          horas_extras?: number | null
          horas_trabalhadas?: number | null
          id?: string
          justificada?: boolean | null
          justificativa?: string | null
          observacoes?: string | null
          saida?: string | null
          saida_almoco?: string | null
        }
        Update: {
          atestado_url?: string | null
          created_at?: string
          data?: string
          entrada_manha?: string | null
          entrada_tarde?: string | null
          falta?: boolean | null
          funcionario_id?: string
          horas_extras?: number | null
          horas_trabalhadas?: number | null
          id?: string
          justificada?: boolean | null
          justificativa?: string | null
          observacoes?: string | null
          saida?: string | null
          saida_almoco?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ponto_funcionarios_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_registros: {
        Row: {
          created_at: string | null
          data: string
          entrada_manha: string | null
          entrada_tarde: string | null
          horas_trabalhadas: number | null
          id: string
          observacoes: string | null
          pessoa_id: string
          saida: string | null
          saida_almoco: string | null
          tipo_pessoa: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data: string
          entrada_manha?: string | null
          entrada_tarde?: string | null
          horas_trabalhadas?: number | null
          id?: string
          observacoes?: string | null
          pessoa_id: string
          saida?: string | null
          saida_almoco?: string | null
          tipo_pessoa: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data?: string
          entrada_manha?: string | null
          entrada_tarde?: string | null
          horas_trabalhadas?: number | null
          id?: string
          observacoes?: string | null
          pessoa_id?: string
          saida?: string | null
          saida_almoco?: string | null
          tipo_pessoa?: string
          updated_at?: string | null
        }
        Relationships: []
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
          fotos_galeria: string[] | null
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
          fotos_galeria?: string[] | null
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
          fotos_galeria?: string[] | null
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
          foto_updated_at: string | null
          foto_url: string | null
          funcao: string | null
          id: string
          meta_produtos_mes: number
          meta_servicos_mes: number
          nome: string
          pin_acesso: string | null
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
          foto_updated_at?: string | null
          foto_url?: string | null
          funcao?: string | null
          id?: string
          meta_produtos_mes?: number
          meta_servicos_mes?: number
          nome: string
          pin_acesso?: string | null
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
          foto_updated_at?: string | null
          foto_url?: string | null
          funcao?: string | null
          id?: string
          meta_produtos_mes?: number
          meta_servicos_mes?: number
          nome?: string
          pin_acesso?: string | null
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
      registro_ponto: {
        Row: {
          aprovado_por: string | null
          created_at: string
          foto_comprovante: string | null
          id: string
          observacao: string | null
          profissional_id: string
          timestamp: string
          tipo: string
        }
        Insert: {
          aprovado_por?: string | null
          created_at?: string
          foto_comprovante?: string | null
          id?: string
          observacao?: string | null
          profissional_id: string
          timestamp?: string
          tipo: string
        }
        Update: {
          aprovado_por?: string | null
          created_at?: string
          foto_comprovante?: string | null
          id?: string
          observacao?: string | null
          profissional_id?: string
          timestamp?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "registro_ponto_aprovado_por_fkey"
            columns: ["aprovado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registro_ponto_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profissionais"
            referencedColumns: ["id"]
          },
        ]
      }
      relatorios_gerados: {
        Row: {
          created_at: string
          date_end: string | null
          date_start: string | null
          filters_applied: Json | null
          generated_at: string
          generated_by: string
          id: string
          pdf_path: string | null
          pdf_url: string | null
          report_subtype: string
          report_type: Database["public"]["Enums"]["report_category"]
          status: string
          synced: boolean
          title: string
          total_records: number | null
          total_value: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_end?: string | null
          date_start?: string | null
          filters_applied?: Json | null
          generated_at?: string
          generated_by?: string
          id?: string
          pdf_path?: string | null
          pdf_url?: string | null
          report_subtype: string
          report_type: Database["public"]["Enums"]["report_category"]
          status?: string
          synced?: boolean
          title: string
          total_records?: number | null
          total_value?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_end?: string | null
          date_start?: string | null
          filters_applied?: Json | null
          generated_at?: string
          generated_by?: string
          id?: string
          pdf_path?: string | null
          pdf_url?: string | null
          report_subtype?: string
          report_type?: Database["public"]["Enums"]["report_category"]
          status?: string
          synced?: boolean
          title?: string
          total_records?: number | null
          total_value?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      respostas_rapidas_whatsapp: {
        Row: {
          atalho: string | null
          ativo: boolean
          categoria: string | null
          created_at: string
          id: string
          mensagem: string
          ordem: number
          titulo: string
        }
        Insert: {
          atalho?: string | null
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          id?: string
          mensagem: string
          ordem?: number
          titulo: string
        }
        Update: {
          atalho?: string | null
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          id?: string
          mensagem?: string
          ordem?: number
          titulo?: string
        }
        Relationships: []
      }
      servicos: {
        Row: {
          aparece_pdv: boolean
          apenas_agenda: boolean
          ativo: boolean
          categoria: string | null
          comissao_padrao: number
          created_at: string
          descricao: string | null
          duracao_minutos: number
          gera_comissao: boolean
          gera_receita: boolean
          id: string
          nome: string
          preco: number
          tipo_servico: string
          updated_at: string
        }
        Insert: {
          aparece_pdv?: boolean
          apenas_agenda?: boolean
          ativo?: boolean
          categoria?: string | null
          comissao_padrao?: number
          created_at?: string
          descricao?: string | null
          duracao_minutos?: number
          gera_comissao?: boolean
          gera_receita?: boolean
          id?: string
          nome: string
          preco: number
          tipo_servico?: string
          updated_at?: string
        }
        Update: {
          aparece_pdv?: boolean
          apenas_agenda?: boolean
          ativo?: boolean
          categoria?: string | null
          comissao_padrao?: number
          created_at?: string
          descricao?: string | null
          duracao_minutos?: number
          gera_comissao?: boolean
          gera_receita?: boolean
          id?: string
          nome?: string
          preco?: number
          tipo_servico?: string
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
      vales: {
        Row: {
          comprovante_url: string | null
          created_at: string
          data_lancamento: string
          data_quitacao: string | null
          forma_desconto: string
          id: string
          motivo: string
          observacoes: string | null
          parcelas_pagas: number
          parcelas_total: number | null
          profissional_id: string
          quitado_por: string | null
          saldo_restante: number | null
          status: string
          updated_at: string
          valor_pago: number
          valor_total: number
        }
        Insert: {
          comprovante_url?: string | null
          created_at?: string
          data_lancamento?: string
          data_quitacao?: string | null
          forma_desconto?: string
          id?: string
          motivo: string
          observacoes?: string | null
          parcelas_pagas?: number
          parcelas_total?: number | null
          profissional_id: string
          quitado_por?: string | null
          saldo_restante?: number | null
          status?: string
          updated_at?: string
          valor_pago?: number
          valor_total: number
        }
        Update: {
          comprovante_url?: string | null
          created_at?: string
          data_lancamento?: string
          data_quitacao?: string | null
          forma_desconto?: string
          id?: string
          motivo?: string
          observacoes?: string | null
          parcelas_pagas?: number
          parcelas_total?: number | null
          profissional_id?: string
          quitado_por?: string | null
          saldo_restante?: number | null
          status?: string
          updated_at?: string
          valor_pago?: number
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "vales_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profissionais"
            referencedColumns: ["id"]
          },
        ]
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
      alert_priority: "baixa" | "media" | "alta"
      alert_status: "novo" | "em_andamento" | "resolvido" | "silenciado"
      alert_type:
        | "aniversario"
        | "agendamento"
        | "estoque"
        | "caixa"
        | "financeiro"
        | "sistema"
      nivel_acesso: "admin" | "gerente" | "operador"
      pin_role: "admin" | "notebook" | "kiosk" | "colaborador_agenda"
      report_category:
        | "vendas"
        | "clientes"
        | "profissionais"
        | "estoque"
        | "financeiro"
        | "crediario"
        | "caixa"
        | "consolidado"
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
      alert_priority: ["baixa", "media", "alta"],
      alert_status: ["novo", "em_andamento", "resolvido", "silenciado"],
      alert_type: [
        "aniversario",
        "agendamento",
        "estoque",
        "caixa",
        "financeiro",
        "sistema",
      ],
      nivel_acesso: ["admin", "gerente", "operador"],
      pin_role: ["admin", "notebook", "kiosk", "colaborador_agenda"],
      report_category: [
        "vendas",
        "clientes",
        "profissionais",
        "estoque",
        "financeiro",
        "crediario",
        "caixa",
        "consolidado",
      ],
    },
  },
} as const

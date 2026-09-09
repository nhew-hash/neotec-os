import type {
  MetaEnviarTextoPayload,
  MetaEnviarTemplatePayload,
  ResultadoEnvioWhatsapp,
} from "./whatsapp.types";


const META_API_VERSION = "v20.0";


function integracaoAtiva(): boolean {

  return Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN &&
    process.env.WHATSAPP_PHONE_NUMBER_ID
  );

}


function endpointEnvio(): string {

  return `https://graph.facebook.com/${META_API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

}



async function chamarMetaApi(
  payload: MetaEnviarTextoPayload | MetaEnviarTemplatePayload
): Promise<ResultadoEnvioWhatsapp> {


  if (!integracaoAtiva()) {

    return {
      enviado: false,
      motivo: "Credenciais do WhatsApp não configuradas"
    };

  }



  try {


    const response = await fetch(
      endpointEnvio(),
      {
        method: "POST",

        headers: {

          Authorization:
            `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,

          "Content-Type":
            "application/json",

        },


        body:
          JSON.stringify(payload),

      }
    );



    const data = await response.json();



    if (!response.ok) {

      console.error(
        "Erro Meta WhatsApp:",
        data
      );


      return {

        enviado: false,

        motivo:
          data?.error?.message ??
          "Erro desconhecido da Meta"

      };

    }



    return {

      enviado: true,

      whatsappMessageId:
        data?.messages?.[0]?.id

    };



  } catch (error) {


    return {

      enviado: false,

      motivo:
        error instanceof Error
          ? error.message
          : "Erro de conexão"

    };


  }


}



export function montarPayloadTexto(
  telefone: string,
  texto: string
): MetaEnviarTextoPayload {


  return {

    messaging_product:
      "whatsapp",

    to:
      telefone,

    type:
      "text",

    text: {

      body:
        texto

    }

  };


}




export function montarPayloadTemplate(
  telefone: string,
  nomeTemplate: string,
  idioma: string,
  variaveis: string[]
): MetaEnviarTemplatePayload {


  return {

    messaging_product:
      "whatsapp",

    to:
      telefone,

    type:
      "template",


    template: {

      name:
        nomeTemplate,


      language: {

        code:
          idioma

      },


      components:
        variaveis.length > 0

          ? [

              {

                type:
                  "body",


                parameters:
                  variaveis.map(
                    (v)=>({

                      type:
                        "text",

                      text:
                        v

                    })
                  )

              }

            ]

          : undefined

    }

  };


}




export async function enviarTexto(
  telefone:string,
  texto:string
):Promise<ResultadoEnvioWhatsapp>{


  return chamarMetaApi(
    montarPayloadTexto(
      telefone,
      texto
    )
  );


}




export async function enviarTemplate(
  telefone:string,
  nomeTemplate:string,
  idioma:string,
  variaveis:string[]
):Promise<ResultadoEnvioWhatsapp>{


  return chamarMetaApi(
    montarPayloadTemplate(
      telefone,
      nomeTemplate,
      idioma,
      variaveis
    )
  );


}




export {
  integracaoAtiva
};
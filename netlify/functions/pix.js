const https = require('https');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Método não permitido' };
  }

  try {
    const data = JSON.parse(event.body);
    const accessToken = "APP_USR-8570367405288309-030214-95bacf639168fb13ee5961181ead21d4-1014227895";

    const payload = JSON.stringify({
      transaction_amount: Number(data.amount),
      description: `Pacote de ${data.quantity} Cotas - Império da Sorte`,
      payment_method_id: "pix",
      payer: {
        email: "cliente@imperiodasorte.com.br", // MP exige um email
        first_name: data.phone || "Comprador"
      }
    });

    const options = {
      hostname: 'api.mercadopago.com',
      path: '/v1/payments',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': Math.random().toString(36).substring(2),
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const result = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch (e) {
            reject(new Error('Erro ao processar resposta do Mercado Pago'));
          }
        });
      });

      req.on('error', (e) => reject(e));
      req.write(payload);
      req.end();
    });

    if (result.status !== 200 && result.status !== 201) {
      throw new Error(result.data.message || 'Erro no Mercado Pago');
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        id: result.data.id,
        qr_code: result.data.point_of_interaction.transaction_data.qr_code,
        qr_code_base64: result.data.point_of_interaction.transaction_data.qr_code_base64
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
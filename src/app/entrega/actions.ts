'use server';

export async function checkDeliveryCode(code: string): Promise<boolean> {
  return typeof code === 'string' && code === '1010';
}

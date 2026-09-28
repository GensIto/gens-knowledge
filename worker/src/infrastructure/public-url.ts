import ipaddr from 'ipaddr.js';
import { AppError } from '../domain/errors';

export function publicUrl(input: string): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new AppError('URLが不正です');
  }

  const host = url.hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/\.$/, '');

  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    (url.port && !['80', '443'].includes(url.port))
  ) {
    throw new AppError('通常のHTTP / HTTPS URLのみ保存できます');
  }

  if (
    !host.includes('.') ||
    /(^|\.)(localhost|local|internal|test|invalid)$/.test(host) ||
    host === 'metadata.google.internal'
  ) {
    throw new AppError('内部ネットワークのURLは保存できません');
  }

  if (ipaddr.isValid(host) && ipaddr.process(host).range() !== 'unicast') {
    throw new AppError('内部・予約済みIPアドレスは保存できません');
  }

  // IPv6 literals are rejected conservatively, including transition/embedded IPv4 forms.
  if (host.includes(':')) throw new AppError('IPv6アドレスを直接指定するURLには対応していません');
  url.hash = '';
  return url;
}

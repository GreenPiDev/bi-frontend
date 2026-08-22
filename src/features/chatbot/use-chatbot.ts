import { useMutation } from '@tanstack/react-query';
import { sendChatMessage } from '../../lib/api';

export function useSendChatMessageMutation() {
  return useMutation({
    mutationFn: sendChatMessage,
  });
}

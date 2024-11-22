import { onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useIdentityStore } from '../store/IdentityStore';

export function useIdentity() {
  const store = useIdentityStore();
  const { identity, hasIdentity } = storeToRefs(store);

  onMounted(async () => {
    if (!hasIdentity.value) {
      await store.initialize();
    }
  });

  return {
    identity,
    hasIdentity,
  };
}

<template>
  <BaseHelpModal :is-visible="isVisible" title="Manufacturing Properties - Help" @close="close">
    <div class="help-section">
      <h6 class="help-section-title">What are manufacturing properties?</h6>
      <div class="help-content">
        <p>
          The <code>Switch orientation</code> and <code>Stabilizer orientation</code> allow to
          define mounting orientation of physical switches and its stabilizers. These rotations are
          applied by <b>Plate Generator</b> independently on top of layout rotations and must be
          multiply of 90&#176;.
        </p>

        <p>
          Most of the plate stabilizer cutouts types are unidirectional forcing specific mounting
          orientation on the plate or PCB. Always validate that stabilizer cutout matches intended
          mounting orientation of stabilizer.
        </p>

        <p>
          For Cherry MX PCB mounted stabilizer with wire facing south, this is correct PCB footprint
          orientation and corresponding <b>Cherry MX Basic</b> cutout position:
        </p>

        <div class="d-flex flex-wrap align-items-center">
          <img
            src="/cherry-mx-pcb-stabilizer-3d.png"
            alt="Example of Cherry MX stabilizer orientation"
            class="example-image"
          />
          <img
            src="/cherry-mx-pcb-stabilizer-pcb.png"
            alt="Example of Chery MX stabilizer PCB footprint orientation"
            class="example-image"
          />
          <img
            src="/cherry-mx-pcb-stabilizer-cutout.png"
            alt="Example of Cherry MX plate cutout orientation"
            class="example-image"
          />
        </div>
      </div>
    </div>
  </BaseHelpModal>
</template>

<script setup lang="ts">
import BaseHelpModal from './BaseHelpModal.vue'

interface Props {
  isVisible: boolean
}

interface Emits {
  (e: 'close'): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const close = () => {
  emit('close')
}
</script>

<style scoped>
.example-image {
  max-width: 250px;
  margin-left: 1rem;
  margin-bottom: 0.5rem;
}
</style>

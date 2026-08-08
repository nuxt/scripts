<template>
  <div>
    <div>deskcrew</div>
    <ScriptDeskCrew widget-key="pub_deskcrewdemo" board="demo" class="deskcrew">
      <template #awaitingLoad>
        <div class="deskcrew-icon" />
      </template>
      <template #loading>
        <ScriptLoadingIndicator color="white" />
      </template>
    </ScriptDeskCrew>
  </div>
</template>

<style>
.deskcrew {
  width: 54px;
  height: 54px;
  border-radius: 54px;
  cursor: pointer;
  background-color: #0f172a;
  position: fixed;
  bottom: 20px;
  right: 24px;
  z-index: 100000;
  box-shadow: 0 4px 10px 0 rgba(0, 0, 0, .05) !important;
}
.deskcrew-icon {
  position: absolute;
  top: 15px;
  left: 13px;
  width: 28px;
  height: 24px;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  background-image: url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cpath d='M8.5 10.5 12.5 16l-4 5.5' fill='none' stroke='%23fff' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M15.5 21.5h8' fill='none' stroke='%23fff' stroke-width='2.2' stroke-linecap='round'/%3E%3C/svg%3E");
}
@media (max-height: 600px) {
  .deskcrew {
    bottom: 14px;
    right: 14px;
  }
}
</style>

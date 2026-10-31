<script setup>
import { ref } from 'vue';

defineProps({
    logs: { type: Array, default: () => [] },
});

const open = ref(true);

const isError = (msg) => /错误|失败/.test(msg);
</script>

<template>
    <div v-if="logs.length" class="card query-log">
        <div class="log-header" @click="open = !open">
            <span>查询日志（{{ logs.length }} 条）</span>
            <span class="toggle">{{ open ? '收起' : '展开' }}</span>
        </div>
        <ul v-show="open" class="log-list">
            <li v-for="(item, index) in logs" :key="index" :class="{ 'is-error': isError(item.msg) }">
                <span class="log-time">+{{ item.at }}ms</span>
                <span class="log-msg">{{ item.msg }}</span>
            </li>
        </ul>
    </div>
</template>

<style scoped>
.query-log {
    background-color: var(--card-background);
    border-radius: 12px;
    padding: 1rem 1.25rem;
    box-shadow: 0 4px 25px var(--shadow-color);
    margin-bottom: 1.5rem;
}

.log-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    font-weight: 600;
    user-select: none;
}

.toggle {
    font-size: 0.85rem;
    opacity: 0.7;
}

.log-list {
    list-style: none;
    margin: 0.75rem 0 0;
    padding: 0;
    max-height: 260px;
    overflow-y: auto;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.85rem;
}

.log-list li {
    display: flex;
    gap: 0.75rem;
    padding: 0.25rem 0;
    border-bottom: 1px dashed rgba(127, 127, 127, 0.2);
}

.log-time {
    flex-shrink: 0;
    opacity: 0.6;
    min-width: 72px;
}

.log-msg {
    word-break: break-all;
}

.log-list li.is-error .log-msg {
    color: #dc2626;
}
</style>

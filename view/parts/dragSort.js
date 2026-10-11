// view/parts/dragSort.js - ドラッグ＆ドロップによる並び替え

// staticLists: それ自体が1つのリストである要素群
// groupedContainer: 内部に複数の .task-list を持つ要素 (同一リスト内でのみ並び替え可)
export function bindDragAndDrop(staticLists, groupedContainer, handleSortUpdate) {
   let draggedElement = null;
   let sourceList = null;

   staticLists.forEach(targetList => {
      if (!targetList) return;
      setupDragEventsForList(targetList, () => draggedElement, (el) => draggedElement = el, handleSortUpdate);
   });

   if (groupedContainer) {
      groupedContainer.addEventListener('dragstart', (e) => {
         draggedElement = e.target.closest('.task-item');
         if (draggedElement) {
            draggedElement.classList.add('dragging');
            sourceList = draggedElement.closest('.task-list');
         }
      });

      groupedContainer.addEventListener('dragover', (e) => {
         e.preventDefault();
         const currentList = e.target.closest('.task-list');
         if (!currentList || currentList !== sourceList) return;

         const afterElement = getDragAfterElement(currentList, e.clientY);
         if (afterElement == null) {
            currentList.appendChild(draggedElement);
         } else {
            currentList.insertBefore(draggedElement, afterElement);
         }
      });

      groupedContainer.addEventListener('dragend', () => {
         if (draggedElement) {
            draggedElement.classList.remove('dragging');
            if (sourceList) {
               const orderedIds = [...sourceList.querySelectorAll('.task-item')].map(li => li.dataset.id);
               handleSortUpdate(orderedIds);
            }
            draggedElement = null;
            sourceList = null;
         }
      });
   }
}

function setupDragEventsForList(targetList, getDragged, setDragged, handleSortUpdate) {
   targetList.addEventListener('dragstart', (e) => {
      const el = e.target.closest('.task-item');
      if (el) {
         el.classList.add('dragging');
         setDragged(el);
      }
   });

   targetList.addEventListener('dragend', () => {
      const dragged = getDragged();
      if (dragged) {
         dragged.classList.remove('dragging');
         setDragged(null);

         const orderedIds = [...targetList.querySelectorAll('.task-item')].map(li => li.dataset.id);
         handleSortUpdate(orderedIds);
      }
   });

   targetList.addEventListener('dragover', (e) => {
      e.preventDefault();
      const dragged = getDragged();
      if (!dragged) return;

      const afterElement = getDragAfterElement(targetList, e.clientY);
      if (afterElement == null) {
         targetList.appendChild(dragged);
      } else {
         targetList.insertBefore(dragged, afterElement);
      }
   });
}

function getDragAfterElement(container, y) {
   const draggableElements = [...container.querySelectorAll('.task-item:not(.dragging)')];
   return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
         return { offset: offset, element: child };
      } else {
         return closest;
      }
   }, { offset: Number.NEGATIVE_INFINITY }).element;
}

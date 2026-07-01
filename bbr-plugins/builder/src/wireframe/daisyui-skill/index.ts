// DaisyUI 5 공식 스킬(saadeghi/daisyui · skills/daisyui · commit d6a87c45)에서 vendor 한 문서.
// 전체 코퍼스는 ./components/*.md + ./usage + ./colors 에 그대로 있다(전체 vendor, 버전 고정).
// 빌드에는 아래 CORE 만 텍스트로 인라인되어 와이어프레임 프롬프트에 상시 주입된다.
// 롱테일 컴포넌트를 상시 주입하려면 import 추가 후 CORE 배열에 넣으면 된다.
//
// colors/usage 는 주입하지 않는다: colors 문서는 임의 Tailwind 색(bg-blue-500 등)·picsum
// 외부 이미지를 권하는데, 우리는 corporate 테마 변수만 쓰고 외부 이미지를 금지하므로
// 그 규칙은 wireframe-prompt 의 시각 규약 헤더가 스킬보다 우선한다.
import button from "./components/button.md";
import card from "./components/card.md";
import input from "./components/input.md";
import select from "./components/select.md";
import textarea from "./components/textarea.md";
import checkbox from "./components/checkbox.md";
import radio from "./components/radio.md";
import toggle from "./components/toggle.md";
import label from "./components/label.md";
import fieldset from "./components/fieldset.md";
import table from "./components/table.md";
import list from "./components/list.md";
import modal from "./components/modal.md";
import dropdown from "./components/dropdown.md";
import menu from "./components/menu.md";
import navbar from "./components/navbar.md";
import tab from "./components/tab.md";
import badge from "./components/badge.md";
import alert from "./components/alert.md";
import steps from "./components/steps.md";
import stat from "./components/stat.md";
import join from "./components/join.md";
import loading from "./components/loading.md";
import divider from "./components/divider.md";

// 프롬프트에 상시 주입할 핵심 컴포넌트 문서(각 .md = 클래스명 + Syntax 예시 + Rules).
export const DAISYUI_CORE_DOCS: string = [
  button, card, input, select, textarea, checkbox, radio, toggle,
  label, fieldset, table, list, modal, dropdown, menu, navbar,
  tab, badge, alert, steps, stat, join, loading, divider,
]
  .map((d) => d.trim())
  .filter(Boolean)
  .join("\n\n");

export const SKILLS = [
    {
        id: 'multishot',
        name: '멀티샷',
        description: '화살을 한 발 더 발사합니다.',
        apply: (player) => {
            player.projectileCount = (player.projectileCount || 1) + 1;
        }
    },
    {
        id: 'attack_boost',
        name: '공격력 증가',
        description: '공격력이 상승합니다.',
        apply: (player) => {
            player.damage = Math.floor(player.damage * 1.25);
        }
    },
    {
        id: 'speed_boost',
        name: '공격 속도 증가',
        description: '공격 속도가 빨라집니다.',
        apply: (player) => {
            player.attackSpeed *= 0.75; // Lower is faster
        }
    },
    {
        id: 'ricochet',
        name: '도탄',
        description: '화살이 근처 적에게 튕깁니다.',
        apply: (player) => {
            player.hasRicochet = true;
        }
    },
    {
        id: 'hp_boost',
        name: '최대 체력 증가',
        description: '최대 체력이 50 증가하고 회복합니다.',
        apply: (player) => {
            player.maxHp += 50;
            player.hp += 50;
        }
    },
    {
        id: 'hp_heal',
        name: 'HP 회복',
        description: '체력을 50 회복합니다.',
        apply: (player) => {
            player.hp = Math.min(player.hp + 50, player.maxHp);
        }
    }
];

export class SkillSystem {
    static getRandomSkills(count = 3) {
        const shuffled = [...SKILLS].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }
}

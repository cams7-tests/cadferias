/**
 * 
 */
package br.com.cams7.feriasfuncionarios.repository;

import br.com.cams7.feriasfuncionarios.model.StaffEntity;
import br.com.cams7.feriasfuncionarios.model.vo.SearchBySelectVO;

/**
 * @author ceanm
 *
 */
public interface StaffRepositoryCustom {

	/**
	 * Busca as equipes que tenham nomes começando com o valor informado
	 * 
	 * @param search Filtro de busca
	 * @return Equipes
	 */
	Iterable<StaffEntity> findByName(SearchBySelectVO search);
}
